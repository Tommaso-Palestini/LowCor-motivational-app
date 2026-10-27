import "./Background.css";

const BLOB_COUNT = 6;

function Background({ animated, image, dim }) {
  if (image) {
    return (
      <div className="custom-bg" aria-hidden="true">
        <div className="custom-bg-image" style={{ backgroundImage: `url(${image})` }} />
        <div className="custom-bg-veil" style={{ "--dim": `${dim}%` }} />
      </div>
    );
  }
  return (
    <div className={`lava ${animated ? "" : "lava--still"}`} aria-hidden="true">
      {Array.from({ length: BLOB_COUNT }, (_, index) => (
        <span key={index} className={`lava-blob lava-blob--${index}`} />
      ))}
    </div>
  );
}

export default Background;
