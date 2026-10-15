import "./Background.css";

const BLOB_COUNT = 6;

function Background({ animated }) {
  return (
    <div className={`lava ${animated ? "" : "lava--still"}`} aria-hidden="true">
      {Array.from({ length: BLOB_COUNT }, (_, index) => (
        <span key={index} className={`lava-blob lava-blob--${index}`} />
      ))}
    </div>
  );
}

export default Background;
