import { HelpCircle, AlertTriangle, CheckCircle2, ExternalLink } from 'lucide-react';
import { Page, PageBody, PageHeader } from '../components/layout';

export function HelpPage() {
  return (
    <Page>
      <PageHeader title="Help & Troubleshooting" description="Common issues and solutions" />

      <PageBody>
        <div className="max-w-4xl space-y-8">
          {/* Audio Interface Monitoring Issues */}
          <section className="rounded-lg border border-dsp-primary/50 bg-dsp-surface/30 p-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="text-lg font-semibold text-dsp-text">
                  Audio Output Not Affected by DSP Processing
                </h2>
                <p className="text-sm text-dsp-text-muted mt-1">
                  CamillaDSP shows signal changes but physical audio output stays the same
                </p>
              </div>
            </div>

            <div className="space-y-4 ml-9">
              <div>
                <h3 className="text-sm font-semibold text-dsp-text mb-2">Symptoms</h3>
                <ul className="list-disc list-inside text-sm text-dsp-text-muted space-y-1">
                  <li>Input signal shows correctly in the app</li>
                  <li>Gain/filter changes show in the output meters</li>
                  <li>But the actual audio you hear doesn't change</li>
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-dsp-text mb-2">Cause</h3>
                <p className="text-sm text-dsp-text-muted">
                  Many USB audio interfaces have <strong>zero-latency monitoring</strong> (also called
                  "direct monitoring") that routes input directly to output in hardware, bypassing
                  all software processing. This is designed for musicians to hear themselves without
                  delay while recording, but it interferes with DSP processing.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-dsp-text mb-2">Solution</h3>
                <div className="bg-dsp-bg/50 rounded-lg p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-dsp-text-muted">
                      <strong>Disable direct monitoring</strong> in your audio interface's control software.
                      This is usually a "Monitor Mix" knob, "Direct Monitor" switch, or mixer faders for
                      input channels.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-dsp-text-muted">
                      <strong>Save settings to the device</strong> if you're using the interface with a
                      headless system (like a Raspberry Pi). Many interfaces reset to defaults when
                      reconnected to a different host.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Topping E2x2 Specific */}
          <section className="rounded-lg border border-dsp-primary/50 bg-dsp-surface/30 p-6">
            <div className="flex items-start gap-3 mb-4">
              <HelpCircle className="h-6 w-6 text-dsp-accent flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="text-lg font-semibold text-dsp-text">
                  Topping E2x2 Configuration
                </h2>
                <p className="text-sm text-dsp-text-muted mt-1">
                  Step-by-step guide for the Topping E2x2 audio interface
                </p>
              </div>
            </div>

            <div className="space-y-4 ml-9">
              <ol className="list-decimal list-inside text-sm text-dsp-text-muted space-y-3">
                <li>
                  <strong>Connect the E2x2 to a Windows or Mac computer</strong>
                  <p className="ml-5 mt-1">The control software is not available for Linux.</p>
                </li>
                <li>
                  <strong>Download and install Topping Professional Control Center</strong>
                  <p className="ml-5 mt-1">
                    Available from{' '}
                    <a
                      href="https://www.toppingaudio.com/support"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-dsp-accent hover:underline inline-flex items-center gap-1"
                    >
                      Topping's website <ExternalLink className="h-3 w-3" />
                    </a>
                  </p>
                </li>
                <li>
                  <strong>In the Mixer section, mute or lower the IN1+2 faders</strong>
                  <p className="ml-5 mt-1">
                    Pull the input channel faders down to -∞ or click MUTE. This prevents
                    direct input from being mixed into the output.
                  </p>
                </li>
                <li>
                  <strong>Set Monitor Mix knob to "Playback"</strong>
                  <p className="ml-5 mt-1">
                    Turn the Monitor Mix knob (bottom right) fully toward "Playback" to hear
                    only processed audio, not direct input.
                  </p>
                </li>
                <li>
                  <strong>Save the configuration to the device</strong>
                  <p className="ml-5 mt-1">
                    Click the save/download icon to store settings in the E2x2's memory.
                    This ensures settings persist when reconnected to your CamillaDSP system.
                  </p>
                </li>
                <li>
                  <strong>Reconnect the E2x2 to your CamillaDSP device</strong>
                  <p className="ml-5 mt-1">
                    The saved settings should now be active, and DSP processing will affect
                    the audio output.
                  </p>
                </li>
              </ol>

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mt-4">
                <p className="text-sm text-yellow-200">
                  <strong>Note:</strong> The E2x2 presents itself as a 6-channel (5.1 surround) device.
                  For best results, configure CamillaDSP to use 2 input channels and 2 output channels
                  with the <code className="bg-dsp-bg/50 px-1 rounded">plughw:CARD=E2x2,DEV=0</code> device.
                </p>
              </div>
            </div>
          </section>

          {/* Channel Count Mismatch */}
          <section className="rounded-lg border border-dsp-primary/50 bg-dsp-surface/30 p-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="text-lg font-semibold text-dsp-text">
                  Configuration Failed to Apply
                </h2>
                <p className="text-sm text-dsp-text-muted mt-1">
                  CamillaDSP rejects the configuration with an error
                </p>
              </div>
            </div>

            <div className="space-y-4 ml-9">
              <div>
                <h3 className="text-sm font-semibold text-dsp-text mb-2">Common Causes</h3>
                <ul className="list-disc list-inside text-sm text-dsp-text-muted space-y-2">
                  <li>
                    <strong>Channel count mismatch:</strong> The mixer's input/output channel count
                    doesn't match the device configuration. Try running Auto Setup again.
                  </li>
                  <li>
                    <strong>Invalid device string:</strong> The ALSA device name may be incorrect.
                    Check that the device exists with <code className="bg-dsp-bg/50 px-1 rounded">aplay -l</code>.
                  </li>
                  <li>
                    <strong>Device busy:</strong> Another application is using the audio device.
                    Stop other audio applications and try again.
                  </li>
                  <li>
                    <strong>Sample rate unsupported:</strong> The device may not support the
                    configured sample rate. Try 48000 Hz or 44100 Hz.
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* No Audio Flow */}
          <section className="rounded-lg border border-dsp-primary/50 bg-dsp-surface/30 p-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="text-lg font-semibold text-dsp-text">
                  No Audio Flowing Through CamillaDSP
                </h2>
                <p className="text-sm text-dsp-text-muted mt-1">
                  Input and output meters show no signal
                </p>
              </div>
            </div>

            <div className="space-y-4 ml-9">
              <div>
                <h3 className="text-sm font-semibold text-dsp-text mb-2">Checklist</h3>
                <ul className="list-disc list-inside text-sm text-dsp-text-muted space-y-2">
                  <li>Verify CamillaDSP is running and connected (green status indicator)</li>
                  <li>Check that routes exist in Signal Flow (lines connecting inputs to outputs)</li>
                  <li>Ensure input gain is not muted or set too low</li>
                  <li>Verify the correct capture device is selected in device settings</li>
                  <li>Check physical audio connections to the interface</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Getting More Help */}
          <section className="rounded-lg border border-dsp-primary/50 bg-dsp-surface/30 p-6">
            <div className="flex items-start gap-3 mb-4">
              <HelpCircle className="h-6 w-6 text-dsp-accent flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="text-lg font-semibold text-dsp-text">
                  Getting More Help
                </h2>
              </div>
            </div>

            <div className="ml-9 space-y-2 text-sm text-dsp-text-muted">
              <p>
                For CamillaDSP-specific issues, consult the{' '}
                <a
                  href="https://github.com/HEnquist/camilladsp"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-dsp-accent hover:underline inline-flex items-center gap-1"
                >
                  CamillaDSP documentation <ExternalLink className="h-3 w-3" />
                </a>
              </p>
              <p>
                For issues with this application, check the browser console (F12) for error
                messages that may help diagnose the problem.
              </p>
            </div>
          </section>
        </div>
      </PageBody>
    </Page>
  );
}
