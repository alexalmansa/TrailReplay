/**
 * Groups items into clusters by transitive pairwise match: if A matches B
 * and B matches C, all three end up in one cluster even if A and C don't
 * match directly. Clusters are returned in the order their first member
 * appears in the input.
 */
export function clusterByPairwiseMatch<T>(items: T[], isMatch: (a: T, b: T) => boolean): T[][] {
  const parent = items.map((_, index) => index);

  function find(index: number): number {
    while (parent[index] !== index) {
      parent[index] = parent[parent[index]];
      index = parent[index];
    }
    return index;
  }

  function union(a: number, b: number) {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) parent[rootB] = rootA;
  }

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (isMatch(items[i], items[j])) union(i, j);
    }
  }

  const clustersByRoot = new Map<number, T[]>();
  const order: number[] = [];
  for (let i = 0; i < items.length; i++) {
    const root = find(i);
    if (!clustersByRoot.has(root)) {
      clustersByRoot.set(root, []);
      order.push(root);
    }
    clustersByRoot.get(root)!.push(items[i]);
  }

  return order.map((root) => clustersByRoot.get(root)!);
}
