function findComponent(exactCollection, prefixCollection, customId) {
  const exact = exactCollection.get(customId);

  if (exact) {
    return exact;
  }

  return prefixCollection.find(component =>
    customId === component.customIdPrefix ||
    customId.startsWith(`${component.customIdPrefix}:`)
  ) || null;
}

module.exports = {
  findComponent
};
