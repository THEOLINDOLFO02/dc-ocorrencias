import { useRef } from 'react';

export function SignaturePad({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  const getPos = (e: React.TouchEvent | React.MouseEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY };
    }
    return { x: ((e as React.MouseEvent).clientX - rect.left) * scaleX, y: ((e as React.MouseEvent).clientY - rect.top) * scaleY };
  };

  const start = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current; if (!canvas) return;
    drawing.current = true;
    const ctx = canvas.getContext('2d')!;
    const { x, y } = getPos(e, canvas);
    ctx.beginPath(); ctx.moveTo(x, y);
  };
  const move = (e: React.TouchEvent | React.MouseEvent) => {
    if (!drawing.current) return; e.preventDefault();
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.strokeStyle = '#1B3A6B'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    const { x, y } = getPos(e, canvas);
    ctx.lineTo(x, y); ctx.stroke(); ctx.moveTo(x, y);
  };
  const end = () => {
    drawing.current = false;
    const canvas = canvasRef.current; if (!canvas) return;
    onChange(canvas.toDataURL('image/png'));
  };
  const clear = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height);
    onChange('');
  };

  return (
    <div>
      <div className="relative border-2 border-dashed border-gray-300 rounded-xl overflow-hidden bg-gray-50">
        <canvas ref={canvasRef} width={600} height={150} className="w-full touch-none"
          onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
          onTouchStart={start} onTouchMove={move} onTouchEnd={end} />
        {value && <img src={value} alt="assinatura" className="absolute inset-0 w-full h-full object-contain pointer-events-none" />}
        {!value && <p className="absolute inset-0 flex items-center justify-center text-xs text-gray-400 pointer-events-none">Assine aqui</p>}
      </div>
      {value && (
        <button type="button" onClick={clear} className="mt-1 text-xs text-red-500 underline">Limpar assinatura</button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// WIZARD
// ─────────────────────────────────────────────
