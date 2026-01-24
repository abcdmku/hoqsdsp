# Requirements Document

## Introduction

The CamillaDSP Frontend is a comprehensive web-based application that provides intuitive control and management of multiple CamillaDSP units. This application enables audio enthusiasts and professionals to configure complex multi-room and multi-zone audio setups through an accessible, user-friendly interface that makes advanced digital signal processing capabilities available without requiring deep technical expertise.

## Glossary

- **CamillaDSP**: Open-source digital signal processing software for audio applications written in Rust
- **DSP_Unit**: A single instance of CamillaDSP running on a device with WebSocket server enabled
- **Audio_Matrix**: Visual representation of input-to-output routing connections and processing stages
- **Biquad_Filter**: Second-order IIR filter including: Highpass, Lowpass, Peaking, Notch, Bandpass, Allpass, Highshelf, Lowshelf, LinkwitzRiley, Butterworth, GeneralNotch
- **Biquad_Combo**: Combined biquad configurations: Tilt EQ, Graphic Equalizer, FivePointPeq
- **FIR_Filter**: Finite impulse response filter using convolution (Raw, Wav, or Values format)
- **Convolution_Filter**: Room correction and impulse response filters loaded from files
- **Delay_Filter**: Time delay compensation in milliseconds, samples, or millimeters with subsample precision
- **Gain_Filter**: Amplitude adjustment (dB or linear scale) and signal inversion
- **Volume_Filter**: Volume control with optional limits, linked to faders
- **Dither_Filter**: Noise-shaped dither types including Simple, Lipshitz, Fweighted, Shibata, ShibataLow
- **DiffEq_Filter**: Generic difference equation filter implementation with custom coefficients
- **Compressor_Filter**: Dynamic range compressor for audio dynamics control
- **Loudness_Filter**: Loudness compensation filter for volume-dependent frequency response
- **NoiseGate_Filter**: Noise gate for reducing low-level noise
- **Mixer**: Channel routing and mixing component with gain, mute, and inversion per source
- **Pipeline**: Complete signal processing chain from input to output with bypass support
- **Resampler**: Sample rate conversion with quality profiles (Fast, Balanced, Accurate, Free variants)
- **Fader**: Volume control channel (Main fader + Aux1-4 auxiliary faders)
- **State_File**: Persistent storage for runtime parameters (volume, mute states)
- **Configuration**: Complete set of DSP parameters and routing for a DSP unit (YAML or JSON)
- **Frontend**: The web-based user interface application
- **Real_Time_Control**: Live adjustment of audio parameters without interrupting playback
- **Multi_Unit_Manager**: Component responsible for managing connections to multiple DSP units

## Requirements

### Requirement 1: Multi-Unit Connection Management

**User Story:** As an audio professional, I want to connect to and manage multiple CamillaDSP units simultaneously, so that I can control complex multi-room audio installations from a single interface.

#### Acceptance Criteria

1. WHEN the Frontend starts, THE Multi_Unit_Manager SHALL discover available CamillaDSP units on the network
2. WHEN a user adds a new DSP unit connection, THE Multi_Unit_Manager SHALL establish and maintain the connection
3. WHEN a DSP unit becomes unavailable, THE Frontend SHALL indicate the disconnected status and attempt reconnection
4. THE Frontend SHALL display the connection status of all configured DSP units in real-time
5. WHEN managing multiple units, THE Frontend SHALL allow switching between units without losing configuration state

### Requirement 2: Audio Matrix Visualization and Control

**User Story:** As a user, I want to visualize and control the complete signal processing pipeline through an interactive matrix, so that I can easily understand and modify how audio signals flow through all processing stages.

#### Acceptance Criteria

1. WHEN displaying the audio matrix, THE Frontend SHALL show all available inputs, processing stages, and outputs in a condensed grid layout
2. WHEN a user clicks on a pipeline element in the matrix, THE Frontend SHALL open an editing interface for that specific processing stage
3. THE Audio_Matrix SHALL visually indicate signal flow through processing stages with clear visual feedback
4. WHEN pipeline changes are made through the matrix, THE Frontend SHALL apply them to the DSP unit in real-time
5. THE Frontend SHALL display condensed representations of all CamillaDSP filter types (Biquad, Conv, Gain, Delay, Dither, DiffEq, Crossover, EQ) within the matrix view with type-specific parameter summaries

### Requirement 3: Comprehensive DSP Filter Configuration

**User Story:** As an audio professional, I want access to all CamillaDSP filter types through an intuitive interface, so that I can create complex audio processing pipelines without manually editing YAML configuration files.

#### Acceptance Criteria

1. WHEN configuring IIR filters, THE Frontend SHALL provide interfaces for all Biquad types: Highpass, Lowpass, Peaking, Notch, Bandpass, Allpass, Highshelf, Lowshelf, LinkwitzRiley, Butterworth, GeneralNotch
2. WHEN configuring FIR filters, THE Frontend SHALL support loading coefficient files (Raw, Wav formats) and direct coefficient input (Values)
3. WHEN setting up crossovers, THE Frontend SHALL provide Linkwitz-Riley and Butterworth crossover filter configuration with selectable orders (1st through 8th)
4. WHEN adding delay compensation, THE Frontend SHALL allow delay specification in milliseconds, samples, or millimeters with subsample precision
5. WHEN configuring gain stages, THE Frontend SHALL provide gain adjustment in dB or linear scale with signal inversion controls
6. WHEN using room correction, THE Frontend SHALL support convolution filter loading from impulse response files with format selection
7. WHEN applying dither, THE Frontend SHALL provide dither type selection (Simple, Lipshitz, Fweighted, Shibata, ShibataLow) for different target bit depths
8. WHEN creating custom filters, THE Frontend SHALL support difference equation filter configuration with A and B coefficient arrays
9. WHEN configuring dynamics processing, THE Frontend SHALL provide dynamic range compressor configuration with threshold, ratio, attack, and release parameters
10. WHEN applying loudness compensation, THE Frontend SHALL provide loudness filter configuration linked to volume level
11. WHEN reducing noise, THE Frontend SHALL provide noise gate configuration with threshold and timing parameters
12. WHEN using biquad combinations, THE Frontend SHALL support Tilt EQ, Graphic Equalizer, and FivePointPeq configurations
13. WHEN configuring volume control, THE Frontend SHALL support Volume filters with optional min/max limits linked to faders

### Requirement 4: Advanced Audio Processing Pipeline

**User Story:** As a system designer, I want to create complex audio processing pipelines with multiple stages, so that I can implement sophisticated crossover networks and room correction systems.

#### Acceptance Criteria

1. WHEN building a pipeline, THE Frontend SHALL provide drag-and-drop interface for arranging processing stages
2. WHEN configuring mixers, THE Frontend SHALL allow flexible channel routing with gain control, mute, inversion, and channel labels per source
3. WHEN setting up resampling, THE Frontend SHALL provide quality profile selection including Fast, Balanced, Accurate, and their Free variants with async rate adjustment options
4. THE Frontend SHALL validate pipeline compatibility and channel count matching between stages
5. WHEN visualizing the pipeline, THE Frontend SHALL display a flowchart showing signal flow and processing stages
6. WHEN modifying pipeline order, THE Frontend SHALL prevent invalid configurations and provide helpful error messages
7. WHEN configuring pipeline steps, THE Frontend SHALL support applying filters to multiple channels in a single step
8. WHEN testing configurations, THE Frontend SHALL support bypassing individual pipeline steps without removing them
9. WHEN using multithreaded processing, THE Frontend SHALL allow configuration of parallel filter execution

### Requirement 5: WebSocket API Integration and Real-Time Control

**User Story:** As a user, I want seamless real-time control of all DSP parameters, so that I can make live adjustments and hear changes immediately without interrupting audio playback.

#### Acceptance Criteria

1. WHEN connecting to a DSP unit, THE Frontend SHALL establish WebSocket connection to the configured port and address
2. WHEN adjusting any parameter, THE Real_Time_Control SHALL send WebSocket commands within 50ms
3. THE Frontend SHALL support all CamillaDSP WebSocket commands including:
   - Configuration: GetConfig, SetConfig, GetConfigJson, SetConfigJson, Reload, ValidateConfig, ReadConfig
   - State: GetState, GetStopReason, Stop, Exit, GetVersion, GetSupportedDeviceTypes
   - Levels: GetSignalLevels, GetCaptureSignalPeak/Rms, GetPlaybackSignalPeak/Rms (with Since/SinceLast variants)
   - Volume: GetVolume, SetVolume, AdjustVolume, GetMute, SetMute, ToggleMute
   - Faders: GetFaderVolume, SetFaderVolume, AdjustFaderVolume, GetFaderMute, SetFaderMute, ToggleFaderMute, GetFaders
   - Processing: GetProcessingLoad, GetBufferLevel, GetClippedSamples, ResetClippedSamples, GetCaptureRate, GetRateAdjust
   - Devices: GetAvailableCaptureDevices, GetAvailablePlaybackDevices
4. WHEN receiving status updates, THE Frontend SHALL display real-time processing state (Running, Paused, Inactive, Starting, Stalled) and stop reasons
5. WHEN multiple users access the same DSP unit, THE Frontend SHALL handle concurrent access and synchronize displays
6. THE Frontend SHALL provide parameter change history with undo/redo functionality through configuration management
7. WHEN network connectivity is lost, THE Frontend SHALL attempt reconnection with exponential backoff and indicate connection status
8. WHEN controlling volume, THE Frontend SHALL support all five faders (Main plus Aux1-4) with independent volume and mute controls
9. WHEN persisting runtime state, THE Frontend SHALL support state file management for volume and mute persistence across restarts
10. WHEN monitoring performance, THE Frontend SHALL display processing load percentage and buffer level metrics

### Requirement 6: Configuration Management and YAML Integration

**User Story:** As a professional installer, I want comprehensive configuration management with full YAML compatibility, so that I can save, load, backup, and share complete DSP setups while maintaining compatibility with native CamillaDSP configurations.

#### Acceptance Criteria

1. WHEN saving configurations, THE Frontend SHALL generate valid CamillaDSP YAML files with all parameters preserved
2. WHEN loading configurations, THE Frontend SHALL parse existing CamillaDSP YAML files and populate the interface correctly
3. THE Frontend SHALL provide configuration versioning with timestamps, user notes, and change tracking
4. WHEN exporting configurations, THE Frontend SHALL create portable files compatible with other CamillaDSP installations
5. THE Frontend SHALL validate configuration syntax and compatibility before applying to prevent system errors
6. WHEN importing configurations, THE Frontend SHALL detect and resolve parameter conflicts or missing dependencies
7. THE Frontend SHALL support configuration templates for common setups (2-way crossover, room correction, etc.)

### Requirement 7: Advanced Audio Monitoring and Analysis

**User Story:** As an audio engineer, I want comprehensive real-time monitoring and analysis tools, so that I can optimize system performance and quickly identify audio issues across all processing stages.

#### Acceptance Criteria

1. WHEN audio is flowing, THE Frontend SHALL display real-time level meters using CamillaDSP's peak and RMS data for capture and playback channels
2. THE Frontend SHALL calculate and display frequency response plots for individual filters and complete pipeline chains based on filter coefficients
3. WHEN signal levels approach clipping, THE Frontend SHALL provide visual warnings based on GetClippedSamples and peak level data
4. THE Frontend SHALL display signal range indicator (0.0 to 2.0 scale where 2.0 = full level)
5. WHEN monitoring multiple DSP units, THE Frontend SHALL provide synchronized level monitoring using configurable update intervals (SetUpdateInterval)
6. THE Frontend SHALL support viewing peak history since processing start with reset capability (GetSignalPeaksSinceStart, ResetSignalPeaksSinceStart)
7. WHEN analyzing system performance, THE Frontend SHALL display processing load (GetProcessingLoad), buffer levels (GetBufferLevel), capture rate (GetCaptureRate), and rate adjustment factor (GetRateAdjust)
8. THE Frontend SHALL support historical level queries using GetSignalLevelsSince for time-based analysis
9. WHEN clipping is detected, THE Frontend SHALL display clipped sample count with option to reset counter

### Requirement 8: Device and Hardware Integration

**User Story:** As a system integrator, I want comprehensive device management and hardware integration, so that I can configure audio interfaces, manage sample rates, and handle different audio backends seamlessly.

#### Acceptance Criteria

1. WHEN configuring audio devices, THE Frontend SHALL support all CamillaDSP backends:
   - Capture: ALSA, CoreAudio, WASAPI (exclusive/shared/loopback modes), JACK, PulseAudio, Bluetooth (Linux), USB gadget, Stdin, Signal Generator, WavFile
   - Playback: ALSA, CoreAudio, WASAPI, JACK, PulseAudio, Stdout, File output
2. THE Frontend SHALL provide device discovery via GetAvailableCaptureDevices and GetAvailablePlaybackDevices WebSocket commands
3. WHEN setting up audio formats, THE Frontend SHALL support all sample formats (S16LE, S24LE, S24LE3, S32LE, FLOAT32LE, FLOAT64LE) with automatic format selection where supported
4. THE Frontend SHALL allow sample rate configuration with automatic device compatibility checking and capture_samplerate override
5. WHEN configuring buffer settings, THE Frontend SHALL provide chunksize, queue limit, target level, and adjust period configuration with latency calculation
6. THE Frontend SHALL support resampling configuration with quality profile selection, enable_rate_adjust, and async resampler options
7. WHEN managing multiple devices, THE Frontend SHALL handle device availability changes and provide reconnection capabilities
8. WHEN configuring silence handling, THE Frontend SHALL support silence threshold and timeout settings for automatic pause
9. WHEN using WASAPI, THE Frontend SHALL support exclusive mode, shared mode, and loopback capture configuration
10. WHEN using signal generator capture, THE Frontend SHALL provide waveform type and frequency configuration for testing

### Requirement 9: User Interface Design and Accessibility

**User Story:** As a user with varying technical expertise, I want an intuitive and accessible interface, so that I can accomplish complex audio tasks without extensive training while maintaining access to advanced features.

#### Acceptance Criteria

1. THE Frontend SHALL provide contextual help and tooltips for all DSP concepts and parameters
2. WHEN displaying complex information, THE Frontend SHALL use progressive disclosure with beginner and expert modes
3. THE Frontend SHALL support keyboard navigation and screen reader compatibility for accessibility
4. THE Frontend SHALL provide visual feedback for all user actions with clear success and error states
5. WHEN errors occur, THE Frontend SHALL display clear, actionable error messages with suggested solutions and links to documentation
6. THE Frontend SHALL support responsive design for use on desktop, tablet, and mobile devices
7. WHEN working with complex configurations, THE Frontend SHALL provide search and filtering capabilities for large parameter sets

### Requirement 10: Data Persistence and Multi-User Collaboration

**User Story:** As a system administrator, I want reliable data persistence and multi-user collaboration features, so that configuration changes are never lost and teams can work together safely on complex audio systems.

#### Acceptance Criteria

1. WHEN configuration changes are made, THE Frontend SHALL automatically save changes to persistent storage with conflict resolution
2. THE Frontend SHALL detect and resolve configuration conflicts when multiple users modify the same DSP unit simultaneously
3. WHEN the Frontend reconnects after network interruption, THE Frontend SHALL synchronize with current DSP unit state and resolve conflicts
4. THE Frontend SHALL maintain comprehensive audit logs of all configuration changes with user attribution and timestamps
5. WHEN backing up data, THE Frontend SHALL ensure data integrity through checksums and validation with automated backup scheduling
6. THE Frontend SHALL support user authentication and role-based access control for different permission levels
7. WHEN collaborating, THE Frontend SHALL provide real-time notifications of changes made by other users with change highlighting

## Optimal User Flow

The following user flow represents the recommended experience for configuring and managing CamillaDSP units:

### Flow 1: Initial Setup (New User)
1. **Launch Application** → Dashboard displays with empty unit list
2. **Add DSP Unit** → User enters IP address and port (or uses network discovery)
3. **Connection Established** → Frontend fetches current config via GetConfig, displays device status
4. **Device Configuration** → User selects capture/playback devices from discovered list
5. **Sample Rate Setup** → User configures sample rate, buffer size, and format
6. **Save & Apply** → Configuration saved and applied via SetConfig

### Flow 2: Pipeline Building
1. **Select DSP Unit** → User chooses unit from connected units list
2. **View Current Pipeline** → Audio Matrix displays current routing and filters
3. **Add Filter** → User drags filter type to pipeline position or clicks "Add Filter"
4. **Configure Filter** → Modal opens with filter-specific parameters
5. **Preview Response** → Frequency response graph updates in real-time
6. **Apply Changes** → Changes sent via SetConfig, audio continues uninterrupted
7. **Validate** → Frontend validates via ValidateConfig before applying

### Flow 3: Real-Time Operation
1. **Monitor Levels** → Level meters show capture/playback peak and RMS
2. **Adjust Volume** → Main fader or auxiliary faders control volume in real-time
3. **Quick Mute** → Toggle mute on any fader without stopping processing
4. **Bypass Filters** → Toggle bypass on pipeline stages for A/B comparison
5. **Monitor Performance** → Processing load and buffer status visible at all times

### Flow 4: Configuration Management
1. **Export Config** → Save current configuration as YAML file
2. **Import Config** → Load YAML file, validate, and preview changes
3. **Apply Template** → Load preset configuration (2-way crossover, room correction, etc.)
4. **Version History** → Browse previous configurations with timestamps
5. **Restore Previous** → Revert to any previous configuration version

### Key UI Principles
- **Always-visible status bar** showing: connection state, processing state, clipping indicator, main volume
- **Non-blocking operations** - audio never stops during configuration changes
- **Immediate feedback** - all parameter changes reflected within 50ms
- **Progressive disclosure** - basic mode shows essentials, expert mode reveals all parameters
- **Persistent volume controls** - faders accessible from any screen