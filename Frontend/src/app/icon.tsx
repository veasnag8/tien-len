import { ImageResponse } from 'next/og';

export const size = { width: 64, height: 64 };
export const contentType = 'image/png';

/** Browser tab favicon — 3♠ on felt green. */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(145deg, #0d6b5c 0%, #064e45 55%, #03352f 100%)',
          borderRadius: 14,
          border: '3px solid #d4a017',
        }}
      >
        <div
          style={{
            width: 34,
            height: 46,
            borderRadius: 4,
            background: '#fffef8',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1.5px solid #d4a017',
            color: '#0a1f1c',
            fontSize: 18,
            fontWeight: 700,
            fontFamily: 'Georgia, serif',
            lineHeight: 1,
          }}
        >
          <span>3</span>
          <span style={{ fontSize: 14, marginTop: 1 }}>♠</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
