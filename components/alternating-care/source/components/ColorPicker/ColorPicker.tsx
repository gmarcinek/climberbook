import { hslToHex, reduceSaturation } from '@utils/color';
import React, { useState } from 'react';
import { getHueColor } from './ColorPicker.helpers';
import HueAndSaturationBar from './HueAndSaturationBar';

interface ColorPickerProps {
  onColorChange: (color: string) => void;
  hueHeight?: number;
}

export const ColorPicker = (props: ColorPickerProps) => {
  const { onColorChange, hueHeight } = props;
  const [selectedHue, setSelectedHue] = useState<number>(0);
  const [selectedColor, setSelectedColor] = useState<string>('');

  const updateColor = (position: number, width: number) => {
    const hueColor = getHueColor(position, width);
    const hue = parseFloat(hueColor.match(/\d+(\.\d+)?/)?.[0] || '0');
    const hexColor = hslToHex(hueColor);
    setSelectedHue(hue);
    setSelectedColor(hexColor);
    onColorChange(hexColor);
  };

  const handleInteraction = (
    e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>
  ) => {
    const isTouchEvent = 'touches' in e;
    const position = isTouchEvent
      ? e.touches[0].clientX - e.currentTarget.getBoundingClientRect().left
      : e.nativeEvent.offsetX;
    const width = e.currentTarget.clientWidth;
    updateColor(position, width);
  };

  const brightnessLevels: number[] = [
    90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40, 35, 30, 25, 20,
  ];

  const options = {
    brightnessLevels,
    onColorChange,
    selectedHue,
  };

  return (
    <div style={{ width: '100%' }}>
      {/* Pasek HUE */}
      <div
        onMouseDown={handleInteraction}
        onMouseMove={(e) => e.buttons === 1 && handleInteraction(e)}
        onTouchStart={handleInteraction}
        onTouchMove={handleInteraction}
        style={{
          width: '100%',
          height: '24px',
          background: `linear-gradient(to right, 
                ${reduceSaturation('#ff0000', 5)},
                ${reduceSaturation('#ffff00', 5)},
                ${reduceSaturation('#00ff00', 5)},
                ${reduceSaturation('#00ffff', 5)},
                ${reduceSaturation('#0000ff', 5)},
                ${reduceSaturation('#ff00ff', 5)},
                ${reduceSaturation('#ff0000', 5)}
            )`,
          cursor: 'pointer',
        }}
      />

      {/* Pasek jasności */}
      <div
        style={{
          marginTop: '1rem',
        }}
      >
        <HueAndSaturationBar {...options} hueOffset={0} />
        <HueAndSaturationBar {...options} hueOffset={15} />
        <HueAndSaturationBar {...options} hueOffset={30} />
        <HueAndSaturationBar {...options} hueOffset={45} />
        <HueAndSaturationBar {...options} hueOffset={75} />
        <HueAndSaturationBar {...options} hueOffset={100} />
      </div>
    </div>
  );
};

export default ColorPicker;
