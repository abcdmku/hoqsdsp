import * as React from 'react';
import { useState, useCallback } from 'react';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/Dialog';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';
import type { DSPUnit } from '../../types';

// Validation schema for unit form
const unitSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(50, 'Name must be 50 characters or less'),
  address: z
    .string()
    .min(1, 'Address is required')
    .refine(
      (val) => {
        // Allow IP addresses or hostnames
        const ipRegex = /^(?:\d{1,3}\.){3}\d{1,3}$/;
        const hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        return ipRegex.test(val) || hostnameRegex.test(val);
      },
      'Invalid IP address or hostname'
    ),
  port: z
    .number()
    .int('Port must be an integer')
    .min(1, 'Port must be at least 1')
    .max(65535, 'Port must be at most 65535'),
  zone: z
    .string()
    .max(30, 'Zone must be 30 characters or less')
    .optional(),
  systemMetricsUrl: z
    .string()
    .trim()
    .max(300, 'System metrics URL must be 300 characters or less')
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        if (val.startsWith('/')) return true;
        try {
          const parsedUrl = new URL(val);
          return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
        } catch {
          return false;
        }
      },
      'System metrics URL must be a valid URL or a path starting with /'
    ),
});

type UnitFormData = z.infer<typeof unitSchema>;

export interface AddUnitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (unit: Omit<DSPUnit, 'id'>) => void;
  /** Existing zones for autocomplete */
  existingZones?: string[];
  /** If provided, dialog is in edit mode */
  editingUnit?: DSPUnit;
}

interface FormErrors {
  name?: string;
  address?: string;
  port?: string;
  zone?: string;
  systemMetricsUrl?: string;
}

/**
 * Dialog for adding or editing a CamillaDSP unit.
 */
export function AddUnitDialog({
  open,
  onOpenChange,
  onSubmit,
  existingZones = [],
  editingUnit,
}: AddUnitDialogProps) {
  const isEditing = !!editingUnit;

  const [formData, setFormData] = useState<UnitFormData>({
    name: editingUnit?.name ?? '',
    address: editingUnit?.address ?? '',
    port: editingUnit?.port ?? 1234,
    zone: editingUnit?.zone ?? '',
    systemMetricsUrl: editingUnit?.systemMetricsUrl ?? '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [showZoneSuggestions, setShowZoneSuggestions] = useState(false);

  // Reset form when dialog opens/closes or editing unit changes
  React.useEffect(() => {
    if (open) {
      setFormData({
        name: editingUnit?.name ?? '',
        address: editingUnit?.address ?? '',
        port: editingUnit?.port ?? 1234,
        zone: editingUnit?.zone ?? '',
        systemMetricsUrl: editingUnit?.systemMetricsUrl ?? '',
      });
      setErrors({});
    }
  }, [open, editingUnit]);

  const handleInputChange = useCallback(
    (field: keyof UnitFormData) =>
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = field === 'port' ? parseInt(e.target.value, 10) || 0 : e.target.value;
        setFormData((prev) => ({ ...prev, [field]: value }));
        // Clear error when user starts typing
        if (errors[field]) {
          setErrors((prev) => ({ ...prev, [field]: undefined }));
        }
      },
    [errors]
  );

  const handleZoneSelect = useCallback((zone: string) => {
    setFormData((prev) => ({ ...prev, zone }));
    setShowZoneSuggestions(false);
  }, []);

  const validateForm = useCallback((): boolean => {
    const result = unitSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: FormErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof FormErrors;
        fieldErrors[field] ??= issue.message;
      }
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  }, [formData]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (validateForm()) {
        onSubmit({
          name: formData.name,
          address: formData.address,
          port: formData.port,
          zone: formData.zone ?? undefined,
          systemMetricsUrl: formData.systemMetricsUrl?.trim() || undefined,
        });
        onOpenChange(false);
      }
    },
    [formData, onSubmit, onOpenChange, validateForm]
  );

  const filteredZones = existingZones.filter(
    (zone) =>
      zone.toLowerCase().includes((formData.zone ?? '').toLowerCase()) &&
      zone !== formData.zone
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Unit' : 'Add Unit'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the CamillaDSP unit configuration.'
              : 'Add a new CamillaDSP unit to monitor and control.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Name field */}
          <div className="space-y-1.5">
            <label
              htmlFor="unit-name"
              className="text-sm font-medium text-dsp-text"
            >
              Name
            </label>
            <input
              id="unit-name"
              type="text"
              value={formData.name}
              onChange={handleInputChange('name')}
              placeholder="Living Room DSP"
              className={cn(
                'w-full rounded-md border bg-dsp-bg px-3 py-2 text-sm text-dsp-text placeholder:text-dsp-text-muted',
                'focus:outline-none focus:ring-2 focus:ring-dsp-accent',
                errors.name ? 'border-meter-red' : 'border-dsp-primary/30'
              )}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'name-error' : undefined}
            />
            {errors.name && (
              <p id="name-error" className="text-xs text-meter-red">
                {errors.name}
              </p>
            )}
          </div>

          {/* Address field */}
          <div className="space-y-1.5">
            <label
              htmlFor="unit-address"
              className="text-sm font-medium text-dsp-text"
            >
              Address
            </label>
            <input
              id="unit-address"
              type="text"
              value={formData.address}
              onChange={handleInputChange('address')}
              placeholder="192.168.1.100"
              className={cn(
                'w-full rounded-md border bg-dsp-bg px-3 py-2 text-sm text-dsp-text placeholder:text-dsp-text-muted',
                'focus:outline-none focus:ring-2 focus:ring-dsp-accent',
                errors.address ? 'border-meter-red' : 'border-dsp-primary/30'
              )}
              aria-invalid={!!errors.address}
              aria-describedby={errors.address ? 'address-error' : undefined}
            />
            {errors.address && (
              <p id="address-error" className="text-xs text-meter-red">
                {errors.address}
              </p>
            )}
          </div>

          {/* Port field */}
          <div className="space-y-1.5">
            <label
              htmlFor="unit-port"
              className="text-sm font-medium text-dsp-text"
            >
              Port
            </label>
            <input
              id="unit-port"
              type="number"
              value={formData.port}
              onChange={handleInputChange('port')}
              min={1}
              max={65535}
              className={cn(
                'w-full rounded-md border bg-dsp-bg px-3 py-2 text-sm text-dsp-text',
                'focus:outline-none focus:ring-2 focus:ring-dsp-accent',
                errors.port ? 'border-meter-red' : 'border-dsp-primary/30'
              )}
              aria-invalid={!!errors.port}
              aria-describedby={errors.port ? 'port-error' : undefined}
            />
            {errors.port && (
              <p id="port-error" className="text-xs text-meter-red">
                {errors.port}
              </p>
            )}
          </div>

          {/* System Metrics URL */}
          <div className="space-y-1.5">
            <label
              htmlFor="unit-system-metrics-url"
              className="text-sm font-medium text-dsp-text"
            >
              System metrics URL{' '}
              <span className="font-normal text-dsp-text-muted">(optional)</span>
            </label>
            <input
              id="unit-system-metrics-url"
              type="text"
              value={formData.systemMetricsUrl ?? ''}
              onChange={handleInputChange('systemMetricsUrl')}
              placeholder="http://192.168.1.100:9925/api/system or /api/system"
              className={cn(
                'w-full rounded-md border bg-dsp-bg px-3 py-2 text-sm text-dsp-text placeholder:text-dsp-text-muted',
                'focus:outline-none focus:ring-2 focus:ring-dsp-accent',
                errors.systemMetricsUrl ? 'border-meter-red' : 'border-dsp-primary/30'
              )}
              aria-invalid={!!errors.systemMetricsUrl}
              aria-describedby={errors.systemMetricsUrl ? 'system-metrics-url-error' : undefined}
              autoComplete="off"
            />
            <p className="text-xs text-dsp-text-muted">
              Enables RAM and temperature readings in the status bar.
            </p>
            {errors.systemMetricsUrl && (
              <p id="system-metrics-url-error" className="text-xs text-meter-red">
                {errors.systemMetricsUrl}
              </p>
            )}
          </div>

          {/* Zone field with autocomplete */}
          <div className="relative space-y-1.5">
            <label
              htmlFor="unit-zone"
              className="text-sm font-medium text-dsp-text"
            >
              Zone{' '}
              <span className="font-normal text-dsp-text-muted">(optional)</span>
            </label>
            <input
              id="unit-zone"
              type="text"
              value={formData.zone ?? ''}
              onChange={handleInputChange('zone')}
              onFocus={() => { setShowZoneSuggestions(true); }}
              onBlur={() => { setTimeout(() => { setShowZoneSuggestions(false); }, 150); }}
              placeholder="FOH, Monitors, Fills..."
              className={cn(
                'w-full rounded-md border bg-dsp-bg px-3 py-2 text-sm text-dsp-text placeholder:text-dsp-text-muted',
                'focus:outline-none focus:ring-2 focus:ring-dsp-accent',
                errors.zone ? 'border-meter-red' : 'border-dsp-primary/30'
              )}
              aria-invalid={!!errors.zone}
              aria-describedby={errors.zone ? 'zone-error' : undefined}
              autoComplete="off"
            />
            {errors.zone && (
              <p id="zone-error" className="text-xs text-meter-red">
                {errors.zone}
              </p>
            )}

            {/* Zone suggestions dropdown */}
            {showZoneSuggestions && filteredZones.length > 0 && (
              <div className="absolute z-10 mt-1 w-full rounded-md border border-dsp-primary/30 bg-dsp-surface shadow-lg">
                {filteredZones.map((zone) => (
                  <button
                    key={zone}
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm text-dsp-text hover:bg-dsp-primary/30"
                    onClick={() => { handleZoneSelect(zone); }}
                  >
                    {zone}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => { onOpenChange(false); }}
            >
              Cancel
            </Button>
            <Button type="submit">
              {isEditing ? 'Save Changes' : 'Add Unit'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
