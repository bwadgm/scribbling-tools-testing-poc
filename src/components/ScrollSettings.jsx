export default function ScrollSettings({ settings, onUpdate, onClose }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        zIndex: 10000,
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        minWidth: '300px',
        maxWidth: '400px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
          Scroll Sensitivity
        </h3>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '0 4px',
            color: '#6b7280'
          }}
        >
          ×
        </button>
      </div>
      
      {/* Unified Scroll Sensitivity */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '500' }}>
          Scroll Speed: {settings.scrollSensitivity}x
        </label>
        <input
          type="range"
          min="1"
          max="2"
          step="0.1"
          value={settings.scrollSensitivity}
          onChange={(e) => onUpdate('scrollSensitivity', parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
          <span>Slow (1x)</span>
          <span>Fast (2x)</span>
        </div>
      </div>

      {/* Reset Button */}
      <button
        onClick={() => {
          onUpdate('scrollSensitivity', 1.5)
        }}
        style={{
          width: '100%',
          marginTop: '12px',
          padding: '8px',
          backgroundColor: '#f3f4f6',
          color: '#374151',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: '500',
        }}
      >
        Reset to Default
      </button>
    </div>
  )
}
