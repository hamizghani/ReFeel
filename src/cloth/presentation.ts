/** Only the approved shared shirt asset has animated representations. */
export function animatedVariant(listing:{id:string;templateId?:string}):'cloud'|'reference'|undefined {
  const template=listing.templateId||listing.id;
  return template==='cloud-poplin'?'cloud':template==='my-blue-blouse'?'reference':undefined;
}
