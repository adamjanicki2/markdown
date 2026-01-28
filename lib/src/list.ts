export type LinkedList<T> = {
  head?: LinkedListNode<T>;
  tail?: LinkedListNode<T>;
};

export type LinkedListNode<T> = {
  prev?: LinkedListNode<T>;
  next?: LinkedListNode<T>;
  value: T;
};

export function appendNode<T>(
  list: LinkedList<T>,
  value: T
): LinkedListNode<T> {
  const tail = list.tail;
  const node = { prev: tail, value };

  if (tail) tail.next = node;
  else list.head = node;

  list.tail = node;
  return node;
}

export function insertNode<T>(
  list: LinkedList<T>,
  after: LinkedListNode<T> | undefined,
  value: T
): LinkedListNode<T> {
  const head = list.head;
  if (!after) {
    const node = { value, next: head };

    if (head) head.prev = node;
    else list.tail = node;

    list.head = node;
    return node;
  }

  const next = after.next;
  const node = { value, prev: after, next };

  if (next) next.prev = node;
  else list.tail = node;

  after.next = node;
  return node;
}

export function removeNode<T>(list: LinkedList<T>, node: LinkedListNode<T>) {
  const { prev, next } = node;
  if (prev) prev.next = next;
  else list.head = next;

  if (next) next.prev = prev;
  else list.tail = prev;
}

export function mapWhile<T, V>(
  start: LinkedListNode<T> | undefined,
  transform: (node: LinkedListNode<T>) => V,
  predicate: (node: LinkedListNode<T>) => boolean
): V[] {
  const arr: V[] = [];
  let node = start;
  while (node && predicate(node)) {
    arr.push(transform(node));
    node = node.next;
  }
  return arr;
}
