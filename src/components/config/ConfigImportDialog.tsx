import * as React from 'react';
import { useState, useCallback, useRef } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle2, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/Dialog';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';
import {
  parseConfigAuto,
  detectFormat,
  type ParseResult,
  type ConfigValidationWarning,
} from '../../lib/config';
import type { CamillaConfig } from '../../types';

export interface ConfigImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (config: CamillaConfig) => void;
  /** Current config for comparison/backup purposes */
  currentConfig?: CamillaConfig | null;
}

type ImportState = 'idle' | 'parsing' | 'valid' | 'error';

interface ImportResult {
  state: ImportState;
  config?: CamillaConfig;
  errors?: string[];
  warnings?: ConfigValidationWarning[];
  filename?: string;
  format?: 'yaml' | 'json' | 'unknown';
}

/**
 * Dialog for importing CamillaDSP configuration from file.
 * Supports both YAML and JSON formats with validation.
 */
export function ConfigImportDialog({
  open,
  onOpenChange,
  onImport,
  currentConfig,
}: ConfigImportDialogProps) {
  const [importResult, setImportResult] = useState<ImportResult>({
    state: 'idle',
  });
  const [isDragging, setIsDragging] = useState(false);
  const [rawContent, setRawContent] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when dialog opens
  React.useEffect(() => {
    if (open) {
      setImportResult({ state: 'idle' });
      setRawContent('');
      setIsDragging(false);
    }
  }, [open]);

  const processFile = useCallback(async (file: File) => {
    setImportResult({ state: 'parsing', filename: file.name });

    try {
      const content = await file.text();
      setRawContent(content);

      const format = detectFormat(content);
      const result: ParseResult = parseConfigAuto(content);

      if (result.success && result.config) {
        setImportResult({
          state: 'valid',
          config: result.config,
          warnings: result.validation?.warnings,
          filename: file.name,
          format,
        });
      } else {
        const errors: string[] = [];

        if (result.yamlError) {
          errors.push(result.yamlError);
        }

        if (result.validation?.errors) {
          errors.push(
            ...result.validation.errors.map(
              (e) => `${e.path}: ${e.message}`,
            ),
          );
        }

        setImportResult({
          state: 'error',
          errors: errors.length > 0 ? errors : ['Unknown validation error'],
          filename: file.name,
          format,
        });
      }
    } catch (error) {
      setImportResult({
        state: 'error',
        errors: [
          error instanceof Error ? error.message : 'Failed to read file',
        ],
        filename: file.name,
      });
    }
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        void processFile(file);
      }
    },
    [processFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        void processFile(file);
      }
    },
    [processFile],
  );

  const handlePasteFromClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setRawContent(text);
        const format = detectFormat(text);
        const result = parseConfigAuto(text);

        if (result.success && result.config) {
          setImportResult({
            state: 'valid',
            config: result.config,
            warnings: result.validation?.warnings,
            filename: 'Pasted content',
            format,
          });
        } else {
          const errors: string[] = [];
          if (result.yamlError) {
            errors.push(result.yamlError);
          }
          if (result.validation?.errors) {
            errors.push(
              ...result.validation.errors.map(
                (e) => `${e.path}: ${e.message}`,
              ),
            );
          }
          setImportResult({
            state: 'error',
            errors: errors.length > 0 ? errors : ['Unknown validation error'],
            filename: 'Pasted content',
            format,
          });
        }
      }
    } catch {
      setImportResult({
        state: 'error',
        errors: ['Failed to read from clipboard'],
      });
    }
  }, []);

  const handleImport = useCallback(() => {
    if (importResult.config) {
      onImport(importResult.config);
      onOpenChange(false);
    }
  }, [importResult.config, onImport, onOpenChange]);

  const handleReset = useCallback(() => {
    setImportResult({ state: 'idle' });
    setRawContent('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const hasCurrentConfig = !!currentConfig;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Configuration</DialogTitle>
          <DialogDescription>
            Import a CamillaDSP configuration from a YAML or JSON file.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {/* Warning about overwriting */}
          {hasCurrentConfig && importResult.state === 'idle' && (
            <div className="flex items-start gap-3 rounded-md border border-meter-yellow/30 bg-meter-yellow/10 p-3">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-meter-yellow" />
              <p className="text-sm text-dsp-text">
                Importing a new configuration will replace the current
                configuration. Make sure to export your current settings first
                if needed.
              </p>
            </div>
          )}

          {/* File drop zone - shown in idle state */}
          {importResult.state === 'idle' && (
            <>
              <div
                className={cn(
                  'relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors',
                  isDragging
                    ? 'border-dsp-accent bg-dsp-accent/10'
                    : 'border-dsp-primary/30 hover:border-dsp-primary/50',
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".yml,.yaml,.json"
                  onChange={handleFileChange}
                  className="absolute inset-0 cursor-pointer opacity-0"
                  aria-label="Choose configuration file"
                />
                <Upload className="mb-3 h-10 w-10 text-dsp-text-muted" />
                <p className="text-center text-sm text-dsp-text">
                  <span className="font-medium">Click to upload</span> or drag
                  and drop
                </p>
                <p className="mt-1 text-xs text-dsp-text-muted">
                  YAML or JSON configuration files
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-dsp-primary/30" />
                <span className="text-xs text-dsp-text-muted">or</span>
                <div className="h-px flex-1 bg-dsp-primary/30" />
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={handlePasteFromClipboard}
              >
                Paste from Clipboard
              </Button>
            </>
          )}

          {/* Parsing state */}
          {importResult.state === 'parsing' && (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-dsp-primary/30 border-t-dsp-accent" />
              <p className="text-sm text-dsp-text-muted">
                Validating {importResult.filename}...
              </p>
            </div>
          )}

          {/* Valid configuration */}
          {importResult.state === 'valid' && importResult.config && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-md border border-status-online/30 bg-status-online/10 p-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-status-online" />
                <div className="flex-1">
                  <p className="font-medium text-dsp-text">
                    Valid configuration
                  </p>
                  <p className="mt-0.5 text-sm text-dsp-text-muted">
                    {importResult.filename} ({importResult.format?.toUpperCase()})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-dsp-text-muted hover:text-dsp-text"
                  aria-label="Clear selection"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Config summary */}
              <div className="rounded-md border border-dsp-primary/30 bg-dsp-bg p-3">
                <h4 className="mb-2 text-sm font-medium text-dsp-text">
                  Configuration Summary
                </h4>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <dt className="text-dsp-text-muted">Title</dt>
                  <dd className="text-dsp-text">
                    {importResult.config.title ?? '(none)'}
                  </dd>
                  <dt className="text-dsp-text-muted">Sample Rate</dt>
                  <dd className="text-dsp-text">
                    {importResult.config.devices.samplerate.toLocaleString()} Hz
                  </dd>
                  <dt className="text-dsp-text-muted">Channels</dt>
                  <dd className="text-dsp-text">
                    {importResult.config.devices.capture.channels} in /{' '}
                    {importResult.config.devices.playback.channels} out
                  </dd>
                  <dt className="text-dsp-text-muted">Filters</dt>
                  <dd className="text-dsp-text">
                    {Object.keys(importResult.config.filters ?? {}).length}
                  </dd>
                  <dt className="text-dsp-text-muted">Mixers</dt>
                  <dd className="text-dsp-text">
                    {Object.keys(importResult.config.mixers ?? {}).length}
                  </dd>
                  <dt className="text-dsp-text-muted">Pipeline Steps</dt>
                  <dd className="text-dsp-text">
                    {importResult.config.pipeline.length}
                  </dd>
                </dl>
              </div>

              {/* Warnings */}
              {importResult.warnings && importResult.warnings.length > 0 && (
                <div className="rounded-md border border-meter-yellow/30 bg-meter-yellow/10 p-3">
                  <h4 className="mb-2 flex items-center gap-2 text-sm font-medium text-dsp-text">
                    <AlertCircle className="h-4 w-4 text-meter-yellow" />
                    Warnings
                  </h4>
                  <ul className="space-y-1 text-sm text-dsp-text-muted">
                    {importResult.warnings.map((warning, i) => (
                      <li key={i}>
                        <code className="text-xs">{warning.path}</code>:{' '}
                        {warning.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Error state */}
          {importResult.state === 'error' && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-md border border-meter-red/30 bg-meter-red/10 p-3">
                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-meter-red" />
                <div className="flex-1">
                  <p className="font-medium text-dsp-text">Invalid configuration</p>
                  {importResult.filename && (
                    <p className="mt-0.5 text-sm text-dsp-text-muted">
                      {importResult.filename}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-dsp-text-muted hover:text-dsp-text"
                  aria-label="Clear selection"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {importResult.errors && (
                <div className="max-h-48 overflow-y-auto rounded-md border border-dsp-primary/30 bg-dsp-bg p-3">
                  <h4 className="mb-2 text-sm font-medium text-dsp-text">
                    Errors
                  </h4>
                  <ul className="space-y-1 text-sm text-meter-red">
                    {importResult.errors.map((error, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-meter-red" />
                        <span className="break-all">{error}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Show raw content preview for debugging */}
              {rawContent && (
                <details className="text-sm">
                  <summary className="cursor-pointer text-dsp-text-muted hover:text-dsp-text">
                    Show raw content
                  </summary>
                  <pre className="mt-2 max-h-32 overflow-auto rounded-md border border-dsp-primary/30 bg-dsp-bg p-2 text-xs">
                    {rawContent.slice(0, 2000)}
                    {rawContent.length > 2000 && '...'}
                  </pre>
                </details>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => { onOpenChange(false); }}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={importResult.state !== 'valid'}
            >
              <FileText className="mr-2 h-4 w-4" />
              Import Configuration
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
