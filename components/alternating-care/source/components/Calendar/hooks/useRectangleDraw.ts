import { useCallback, useState } from 'react';

interface RectStyle {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface UseRectangleDrawReturn {
  rectStyle: RectStyle | null;
  isDrawing: boolean;
  onMouseDown: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
  onMouseMove: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
  onMouseUp: () => void;
}

const useRectangleDraw = (): UseRectangleDrawReturn => {
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [rectStart, setRectStart] = useState<{
    startX: number;
    startY: number;
  } | null>(null);
  const [rectStyle, setRectStyle] = useState<RectStyle | null>(null);

  const onMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
      const startX = e.clientX;
      const startY = e.clientY;
      setRectStart({ startX, startY });
      setIsDrawing(true);
    },
    []
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
      if (!isDrawing || !rectStart) return;

      const currentX = e.clientX;
      const currentY = e.clientY;

      const x = Math.min(currentX, rectStart.startX);
      const y = Math.min(currentY, rectStart.startY);
      const width = Math.abs(currentX - rectStart.startX);
      const height = Math.abs(currentY - rectStart.startY);

      setRectStyle({
        left: x,
        top: y,
        width,
        height,
      });
    },
    [isDrawing, rectStart]
  );

  const onMouseUp = useCallback(() => {
    if (isDrawing) {
      setIsDrawing(false);
    }
  }, [isDrawing]);

  return {
    rectStyle,
    isDrawing,
    onMouseDown,
    onMouseMove,
    onMouseUp,
  };
};

export default useRectangleDraw;
