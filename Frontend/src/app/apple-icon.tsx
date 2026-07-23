import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

/** Apple touch icon — 3♠ on felt green. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(145deg, #0d6b5c 0%, #064e45 50%, #03352f 100%)',
          borderRadius: 36,
          border: '6px solid #d4a017',
        }}
      >
        <div
          style={{
            width: 96,
            height: 132,
            borderRadius: 12,
            background: '#fffef8',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            border: '3px solid #d4a017',
            color: '#0a1f1c',
            fontSize: 52,
            fontWeight: 700,
            fontFamily: 'Georgia, serif',
            lineHeight: 1,
          }}
        >
          <span>3</span>
          <span style={{ fontSize: 40, marginTop: 4 }}>♠</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
