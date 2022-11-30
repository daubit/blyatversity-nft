export function getAttribsFromFilename(
  type: string,
  filename: string
): {
  trait_type: string;
  value: string;
}[] {
  console.log(`invalid type ${type}`);
  process.exit(1);
}

export function getName(
  category: string,
  metadataAttribs: { value: string }[],
  metadataTemplate: Record<string, unknown>
): string {
  throw new Error(`unknown category ${category}`);
}
