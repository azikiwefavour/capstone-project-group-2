export function clarificationMatchesId(record, clarificationId) {
  return record?.id != null && String(record.id).trim() !== '' && String(record.id) === clarificationId
}
