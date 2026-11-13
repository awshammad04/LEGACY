import { useMemo } from 'react';
import * as THREE from 'three';

/** Billboard text label drawn into a canvas texture (robust alternative to DOM overlays in 3D). */
export function TextSprite({ text, color = '#ffffff', border = '#5ad1ff', height = 3, position }: { text: string; color?: string; border?: string; height?: number; position?: [number, number, number] }) {
  const { texture, aspect } = useMemo(() => {
    const font = 44;
    const pad = 22;
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d')!;
    ctx.font = `600 ${font}px Inter, "IBM Plex Sans Arabic", system-ui, sans-serif`;
    const w = Math.ceil(ctx.measureText(text).width) + pad * 2;
    const h = font + pad * 1.4;
    c.width = w;
    c.height = h;
    const ctx2 = c.getContext('2d')!;
    ctx2.font = `600 ${font}px Inter, "IBM Plex Sans Arabic", system-ui, sans-serif`;
    ctx2.fillStyle = 'rgba(5,10,20,0.78)';
    ctx2.strokeStyle = border;
    ctx2.lineWidth = 4;
    const r = 14;
    ctx2.beginPath();
    ctx2.moveTo(r, 2);
    ctx2.arcTo(w - 2, 2, w - 2, h - 2, r);
    ctx2.arcTo(w - 2, h - 2, 2, h - 2, r);
    ctx2.arcTo(2, h - 2, 2, 2, r);
    ctx2.arcTo(2, 2, w - 2, 2, r);
    ctx2.closePath();
    ctx2.fill();
    ctx2.stroke();
    ctx2.fillStyle = color;
    ctx2.textBaseline = 'middle';
    ctx2.textAlign = 'center';
    ctx2.direction = /[؀-ۿ]/.test(text) ? 'rtl' : 'ltr';
    ctx2.fillText(text, w / 2, h / 2 + 2);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return { texture: tex, aspect: w / h };
  }, [text, color, border]);
  return (
    <sprite position={position} scale={[height * aspect, height, 1]} renderOrder={10}>
      <spriteMaterial map={texture} transparent depthWrite={false} fog={false} />
    </sprite>
  );
}
