export default function(felid) {
  if (felid && felid.image) {
    return felid.image;
  }
  return '';
}
