import { constants } from "./constants.js";

const top = 0;
const parent = i => ((i + 1) >>> 1) - 1;
const left = i => (i << 1) + 1;
const right = i => (i + 1) << 1;

export class PriorityQueue {
  constructor(comparator = (a, b) => a > b) {
    this.task_count = new Map();
    this.emergency_task_count = new Map();
    this.unit_count = new Map();
    this._heap = [];
    this._comparator = comparator;
  }
  size() {
    return this._heap.length;
  }
  isEmpty() {
    return this.size() == 0;
  }
  peek() {
    return this._heap[top];
  }
  push(...values) {
    values.forEach(value => {

      if (!this.task_count.has(value.task))
        this.task_count.set(value.task, 0);
      this.task_count.set(value.task, 1 + this.task_count.get(value.task));

      if (!this.emergency_task_count.has(value.task))
        this.emergency_task_count.set(value.task, 0);
      if(value.priority >= constants.EMERGENCY_PRIORITY)
        this.emergency_task_count.set(value.task, 1 + this.emergency_task_count.get(value.task));

      if (!this.unit_count.has(value.unit))
        this.unit_count.set(value.unit, 0);
      this.unit_count.set(value.unit, 1 + this.unit_count.get(value.unit));

      this._heap.push(value);
      this._siftUp();
    });
    return this.size();
  }
  pop() {
    const poppedValue = this.peek();
    const bottom = this.size() - 1;
    if (bottom > top) {
      this._swap(top, bottom);
    }
    this._heap.pop();
    this._siftDown();

    this.task_count.set(poppedValue.task, this.task_count.get(poppedValue.task) - 1);
    this.unit_count.set(poppedValue.unit, this.unit_count.get(poppedValue.unit) - 1);
    if(poppedValue.priority >= constants.EMERGENCY_PRIORITY)
      this.emergency_task_count.set(poppedValue.task, this.emergency_task_count.get(poppedValue.task) - 1);
    
    return poppedValue;
  }
  replace(value) {
    const replacedValue = this.peek();
    this._heap[top] = value;
    this._siftDown();
    return replacedValue;
  }
  _greater(i, j) {
    return this._comparator(this._heap[i], this._heap[j]);
  }
  _swap(i, j) {
    [this._heap[i], this._heap[j]] = [this._heap[j], this._heap[i]];
  }
  _siftUp() {
    let node = this.size() - 1;
    while (node > top && this._greater(node, parent(node))) {
      this._swap(node, parent(node));
      node = parent(node);
    }
  }
  _siftDown() {
    let node = top;
    while (
      (left(node) < this.size() && this._greater(left(node), node)) ||
      (right(node) < this.size() && this._greater(right(node), node))
    ) {
      let maxChild = (right(node) < this.size() && this._greater(right(node), left(node))) ? right(node) : left(node);
      this._swap(node, maxChild);
      node = maxChild;
    }
  }
}