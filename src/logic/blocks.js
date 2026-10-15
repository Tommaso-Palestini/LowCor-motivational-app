export function addBlock(blocks, { date, start, end, activityId }) {
  const newBlock = {
    id: crypto.randomUUID(),
    date,
    start,
    end,
    activityId,
    done: false,
  };
  return [...blocks, newBlock];
}

export function toggleBlockDone(blocks, blockId) {
  return blocks.map((block) =>
    block.id === blockId ? { ...block, done: !block.done } : block
  );
}

export function deleteBlock(blocks, blockId) {
  return blocks.filter((block) => block.id !== blockId);
}

export function getBlocksForDate(blocks, date) {
  return blocks
    .filter((block) => block.date === date)
    .sort((a, b) => a.start.localeCompare(b.start));
}