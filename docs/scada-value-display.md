# On-scene measurement display · 3.11.8

The SCADA scene has two mutually exclusive checkboxes: 設備標籤 and 顯示數值. Names remain the default. Checking either option disables the other; clearing the checked option hides both overlays. The choice applies to 3D and 2D, including immersive and mobile landscape views.

Value mode links the original 14 analog signals to 11 tank/instrument cards: PT1–PT4 pressures (101–104), FIT-01–FIT-03 instantaneous/cumulative flow (106–111), conductivity (112), turbidity (113), and raw/product water levels (114–115). Shared membrane pressure signals are not duplicated. Numeric cards retain their units, existing warning thresholds and missing-value display, and update from the same telemetry as the fixed dashboard. Equipment status lamps remain visible in either mode.

3D cards use screen-space leader lines and retain readable type while the camera rotates or zooms. Smaller viewports use compact cards; a row-packing fallback keeps dense readouts separated. Scene-image export captures the selected overlay, including numeric values. The independent 2D drawing uses the same display choice without altering pipe topology or device positions.

Validation covers original signal ownership/coverage and separated desktop/phone layouts, together with the existing telemetry, lamps, topology, report and cloud simulation checks. Browser QA covers both switch directions, all-off mode, 2D values, camera changes, mobile portrait/landscape and scene-image export.
