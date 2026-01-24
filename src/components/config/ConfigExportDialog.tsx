import * as React from 'react';
import { useState, useCallback, useMemo } from 'react';
import { Download, Copy, Check, FileText, FileJson } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/Dialog';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';
import { stringifyConfig, stringifyConfigJson } from '../../lib/config';
import type { CamillaConfig } from '../../types';

export interface ConfigExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: CamillaConfig | null;
  /** Default filename (without extension) */
  defaultFilename?: string;
}

type ExportFormat = 'yaml' | 'json';

/**
 * Dialog for exporting CamillaDSP configuration to file.
 * Supports YAML and JSON formats with preview.
 */
export function ConfigExportDialog({
  open,
  onOpenChange,
  config,
  defaultFilename = 'camilladsp-config',
}: ConfigExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('yaml');
  const [filename, setFilename] = useState(defaultFilename);
  const [copied, setCopied] = useState(false);

  // Reset state when dialog opens
  React.useEffect(() => {
    if (open) {
      setFilename(defaultFilename);
      setCopied(false);
    }
  }, [open, defaultFilename]);

  const exportContent = useMemo(() => {
    if (!config) return '';

    if (format === 'yaml') {
      return stringifyConfig(config);
    }
    return stringifyConfigJson(config);
  }, [config, format]);

  const fileExtension = format === 'yaml' ? '.yml' : '.json';
  const mimeType =
    format === 'yaml' ? 'application/x-yaml' : 'application/json';

  const handleDownload = useCallback(() => {
    if (!exportContent) return;

    const blob = new Blob([exportContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}${fileExtension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [exportContent, filename, fileExtension, mimeType]);

  const handleCopyToClipboard = useCallback(async () => {
    if (!exportContent) return;

    try {
      await navigator.clipboard.writeText(exportContent);
      setCopied(true);
      setTimeout(() => { setCopied(false); }, 2000);
    } catch {
      // Fallback for browsers without clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = exportContent;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => { setCopied(false); }, 2000);
    }
  }, [exportContent]);

  const handleFilenameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      // Remove any extension from input
      const value = e.target.value.replace(/\.(ya?ml|json)$/i, '');
      setFilename(value);
    },
    [],
  );

  if (!config) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Export Configuration</DialogTitle>
            <DialogDescription>
              No configuration loaded to export.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex justify-end">
            <Button variant="ghost" onClick={() => { onOpenChange(false); }}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Export Configuration</DialogTitle>
          <DialogDescription>
            Download your CamillaDSP configuration as a file or copy to
            clipboard.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {/* Config summary */}
          <div className="rounded-md border border-dsp-primary/30 bg-dsp-bg p-3">
            <h4 className="mb-2 text-sm font-medium text-dsp-text">
              Configuration Summary
            </h4>
            <dl className="grid grid-cols-3 gap-x-4 gap-y-1 text-sm">
              <div>
                <dt className="text-dsp-text-muted">Title</dt>
                <dd className="font-medium text-dsp-text">
                  {config.title ?? '(untitled)'}
                </dd>
              </div>
              <div>
                <dt className="text-dsp-text-muted">Sample Rate</dt>
                <dd className="font-medium text-dsp-text">
                  {config.devices.samplerate.toLocaleString()} Hz
                </dd>
              </div>
              <div>
                <dt className="text-dsp-text-muted">Channels</dt>
                <dd className="font-medium text-dsp-text">
                  {config.devices.capture.channels} / {config.devices.playback.channels}
                </dd>
              </div>
            </dl>
          </div>

          {/* Format and filename */}
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-dsp-text">Format</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setFormat('yaml'); }}
                  className={cn(
                    'flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors',
                    format === 'yaml'
                      ? 'border-dsp-accent bg-dsp-accent/10 text-dsp-accent'
                      : 'border-dsp-primary/30 text-dsp-text hover:border-dsp-primary/50',
                  )}
                >
                  <FileText className="h-4 w-4" />
                  YAML
                </button>
                <button
                  type="button"
                  onClick={() => { setFormat('json'); }}
                  className={cn(
                    'flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors',
                    format === 'json'
                      ? 'border-dsp-accent bg-dsp-accent/10 text-dsp-accent'
                      : 'border-dsp-primary/30 text-dsp-text hover:border-dsp-primary/50',
                  )}
                >
                  <FileJson className="h-4 w-4" />
                  JSON
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-1.5">
              <label
                htmlFor="export-filename"
                className="text-sm font-medium text-dsp-text"
              >
                Filename
              </label>
              <div className="flex items-center gap-1">
                <input
                  id="export-filename"
                  type="text"
                  value={filename}
                  onChange={handleFilenameChange}
                  className={cn(
                    'flex-1 rounded-md border border-dsp-primary/30 bg-dsp-bg px-3 py-2 text-sm text-dsp-text',
                    'focus:outline-none focus:ring-2 focus:ring-dsp-accent',
                  )}
                />
                <span className="text-sm text-dsp-text-muted">{fileExtension}</span>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-dsp-text">
                Preview
              </label>
              <span className="text-xs text-dsp-text-muted">
                {exportContent.length.toLocaleString()} characters
              </span>
            </div>
            <pre className="max-h-64 overflow-auto rounded-md border border-dsp-primary/30 bg-dsp-bg p-3 text-xs text-dsp-text">
              {exportContent.slice(0, 5000)}
              {exportContent.length > 5000 && (
                <span className="text-dsp-text-muted">
                  {'\n'}... ({(exportContent.length - 5000).toLocaleString()} more
                  characters)
                </span>
              )}
            </pre>
          </div>

          {/* Actions */}
          <div className="flex justify-between gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handleCopyToClipboard}
              className="gap-2"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-status-online" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy to Clipboard
                </>
              )}
            </Button>

            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => { onOpenChange(false); }}>
                Cancel
              </Button>
              <Button onClick={handleDownload} className="gap-2">
                <Download className="h-4 w-4" />
                Download
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
