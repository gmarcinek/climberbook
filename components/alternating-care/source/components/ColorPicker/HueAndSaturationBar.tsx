import { hslToHex, reduceSaturation } from '@utils/color';
import { getBrightnessColor } from './ColorPicker.helpers';

interface HueAndSaturationBarProps {
  onColorChange: (color: string) => void;
  brightnessLevels: number[];
  selectedHue: number;
  hueOffset: number;
  height?: number;
}

export const HueAndSaturationBar = (props: HueAndSaturationBarProps) => {
  const {
    onColorChange,
    brightnessLevels,
    selectedHue,
    hueOffset = 0,
    height = 19,
  } = props;
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
      }}
    >
      {brightnessLevels.map((brightness) => (
        <div
          key={brightness}
          onClick={() =>
            onColorChange(
              reduceSaturation(
                hslToHex(getBrightnessColor(selectedHue, brightness)),
                hueOffset
              )
            )
          }
          style={{
            width: `${100 / brightnessLevels.length}%`,
            height: `${height}px`,
            margin: '0px',
            backgroundColor: reduceSaturation(
              hslToHex(getBrightnessColor(selectedHue, brightness)),
              hueOffset
            ),
            cursor: 'pointer',
          }}
        />
      ))}
    </div>
  );
};

export default HueAndSaturationBar;
