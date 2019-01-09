import { SPECS } from 'battlecode';
import { open_neighbors, idx, dis } from './helpers.js';

// premade predicates
export function exact_pred(fx, fy) {
    return ((x, y) => fx === x && fy === y);
}
export function around_pred(fx, fy, l, r) {
    return ((x, y) => dis(x, y, fx, fy) <= r && dis(x, y, fx, fy) >= r);
}
export function attack_pred(m, fx, fy){
    return around_pred(fx, fy, 1, m.stats.ar);
}
export function karbonite_pred(m) {
    return ((x, y) => idx(m.karbonite_map, x, y));
}
export function on_path(path) {
    let spath = path.map(a => a.toString());
    return ((x, y) => path.includes([x, y].toString()));
}

export class Pathfinder {
    constructor(m, goal, type) {
        /*
            PathFinder Types
            WORKER
            0 - Mining Path
            1 - Deposit Path
            2 - Church Path
        */
        this.m = m;
        this.type = type;
        this.goal = goal;
        this.speed = SPECS.UNITS[m.me.unit].SPEED;
        this.recalculate();
    }
    next_loc(m, wait = false) {
        let o = {};
        if (m.me.x === this.fin[0] && m.me.y === this.fin[1]) {
            o.fin = true;
            return o;
        }
        o.fin = false;
        // if (this.path.head == undefined) {
        //   return;
        // }
        let next = this.path.head.value;
        let occupied = idx(m.visible_map, ...next);
        if (occupied >= 1) {
            if (wait) {
                o.wait = true;
                return o;
            }
            m.log("RECALCULATING");
            this.recalculate();
            m.log("RECALCULATING DONE");
        }
        if (occupied === -1 && dis(m.me.x, m.me.y, next[0], next[1]) <= m.stats["ms"]) {
            m.log("WTF TRYING TO MOVE TO SOMEWHERE YOU CAN'T GO:" + next[0] + " " + next[1] + " CURRENT: " + m.me.x + " " + m.me.y);
            o.weird = true;
            return o;
        }
        o.weird = false;
        let result = this.path.head.value;
        this.path.removeHead();
        if (m.me.x === result[0] && m.me.y === result[1]) {
            result = this.path.head.value;
            this.path.removeHead();
        }
        m.log("NEXT MOVES: " + result);
        o.res = result;
        return o;
    }
    recalculate() {
        this.path = this.find_path(this.goal);
    }
    find_path(pred) {
        let parent = new Map();
        let vis = new Set();
        let q = new LinkedList();
        q.addToHead([this.m.me.x, this.m.me.y]);
        //let q = [this.loc];
        while (q.len !== 0) {
            //let cur = q.shift();
            let cur = q.head.value;
            q.removeHead();
            if (pred(...cur)) {
                let path = new LinkedList();
                path.addToHead(cur);
                this.fin = cur;
                while (parent.has(cur)) {
                    cur = parent.get(cur);
                    path.addToHead(cur);
                }
                return path;
            }
            for (let space of open_neighbors(this.m, ...cur)) {
                if (vis.has(space.toString())) continue;
                parent.set(space, cur);
                vis.add(space.toString());
                q.addToTail(space);
            }
        }
    }
}

function LinkedList() {
    this.head = null;
    this.tail = null;
    this.len = 0;
}

function Node(value, next, prev) {
    this.value = value;
    this.next = next;
    this.prev = prev;
}

// Add nodes methods

LinkedList.prototype.addToHead = function (value) {
    const newNode = new Node(value, this.head, null);
    if (this.head) this.head.prev = newNode;
    else this.tail = newNode;
    this.head = newNode;
    this.len += 1;
};

LinkedList.prototype.addToTail = function (value) {
    const newNode = new Node(value, null, this.tail);
    if (this.tail) this.tail.next = newNode;
    else this.head = newNode;
    this.tail = newNode;
    this.len += 1;
}

// Remove nodes methods
LinkedList.prototype.removeHead = function () {
    if (!this.head) return null;
    let value = this.head.value;
    this.head = this.head.next;

    if (this.head) this.head.prev = null;
    else this.tail = null;
    this.len -= 1;
    return value;

}

LinkedList.prototype.removeTail = function () {
    if (!this.tail) return null;
    let value = this.tail.value;
    this.tail = this.tail.prev;

    if (this.tail) this.tail.next = null;
    else this.head = null;
    this.len -= 1;
    return value;
}

// Search method

LinkedList.prototype.search = function (searchValue) {
    let currentNode = this.head;

    while (currentNode) {
        if (currentNode.value === searchValue) return currentNode;
        currentNode = currentNode.next;
    }
    return null;
}

LinkedList.prototype.len = function () {
    return this.len;
}