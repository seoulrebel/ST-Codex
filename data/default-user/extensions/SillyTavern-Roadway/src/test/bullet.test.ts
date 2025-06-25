function extractBulletPoints(text: string): string[] {
  const matches = text.match(/^(?:\d+\.(?:\s+|(?=\S))|-\s+)(.*)$/gm) || [];
  return matches.map((line) => {
    return line.replace(/^(?:\d+\.(?:\s+|(?=\S))|-\s+)/, '').trim();
  });
}

describe('extractBulletPoints', () => {
  it('should extract numbered list items from text', () => {
    const input = `Here's a list of actions:
1. Jump from tree to tree
2. Hide in the shadows
3. Create a diversion

Additional text here.`;

    const expected = ['Jump from tree to tree', 'Hide in the shadows', 'Create a diversion'];
    expect(extractBulletPoints(input)).toEqual(expected);
  });

  it('should return array with original text if no numbered list items found', () => {
    const input = 'Just some regular text without numbered lists.';
    expect(extractBulletPoints(input)).toEqual([]);
  });

  it('should handle empty string', () => {
    expect(extractBulletPoints('')).toEqual([]);
  });

  it('should extract only properly formatted numbered items', () => {
    const input = `Different formats:
1. Correct format
a. Wrong format
- Line corrected format
1) Wrong format
10. Also correct format`;

    const expected = ['Correct format', 'Line corrected format', 'Also correct format'];
    expect(extractBulletPoints(input)).toEqual(expected);
  });

  it('should handle items with multiple lines', () => {
    const input = `1. First item
   continues here
2. Second item
   with more text
3. Third item`;

    const expected = ['First item', 'Second item', 'Third item'];
    expect(extractBulletPoints(input)).toEqual(expected);
  });

  it('should handle dash bullet points', () => {
    const input = `- First item
- Second item
- Third item`;
    const expected = ['First item', 'Second item', 'Third item'];
    expect(extractBulletPoints(input)).toEqual(expected);
  });

  it('should handle numbered items without space after dot', () => {
    const input = `1.First item
2.Second item
3.Third item`;
    const expected = ['First item', 'Second item', 'Third item'];
    expect(extractBulletPoints(input)).toEqual(expected);
  });

  it('multiple line breaks', () => {
    const input = `1. First item


- Second item
3. Third item`;
    const expected = ['First item', 'Second item', 'Third item'];
    expect(extractBulletPoints(input)).toEqual(expected);
  });

  it('additional incorrect lines', () => {
    const input = `1. First item
- Second item
3. Third item
Hello there.
Additional text here.`;

    const expected = ['First item', 'Second item', 'Third item'];
    expect(extractBulletPoints(input)).toEqual(expected);
  });
});
