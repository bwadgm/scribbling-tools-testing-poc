export default function ToolbarButton({ onClick, title, icon }) {
  return (
    <button 
      onClick={onClick}
      style={{ 
        background: 'white',
        border: '1px solid #ccc',
        padding: '8px',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '32px',
        height: '32px'
      }}
      title={title}
    >
      {icon}
    </button>
  )
}
