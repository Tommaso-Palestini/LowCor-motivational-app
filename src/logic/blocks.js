export function addBlock(blocks, { date, start, end, activityId, done = false, seriesId = null }) {
  const newBlock = {
    id: crypto.randomUUID(),
    date,
    start,
    end,
    activityId,
    done,
    seriesId,
  };
  return [...blocks, newBlock];
}

export function addBlocks(blocks, drafts) {
  return drafts.reduce((result, draft) => addBlock(result, draft), blocks);
}

export function updateBlock(blocks, blockId, changes) {
  return blocks.map((block) =>
    block.id === blockId ? { ...block, ...changes } : block
  );
}

export function setBlockDone(blocks, blockId, done) {
  return updateBlock(blocks, blockId, { done });
}

export function toggleBlockDone(blocks, blockId) {
  return blocks.map((block) =>
    block.id === blockId ? { ...block, done: !block.done } : block
  );
}

export function deleteBlock(blocks, blockId) {
  return blocks.filter((block) => block.id !== blockId);
}

export function deleteSeries(blocks, seriesId) {
  return blocks.filter((block) => block.seriesId !== seriesId);
}

export function getBlocksForDate(blocks, date) {
  return blocks
    .filter((block) => block.date === date)
    .sort((a, b) => a.start.localeCompare(b.start));
}
