import { SPECS } from 'battlecode';
import { open_neighbors_diff, random_from, most_central_loc, getDef, visible_ally_attackers } from './helpers.js';
import { encode8, decode8, encode16, decode16 } from "./communication.js";
import { constants } from "./constants.js";
import { best_fuel_locs, best_karb_locs, get_resource_radius, get_visible_pilgrims } from './analyzemap.js';
import { PriorityQueue } from './pqueue.js';

export function runChurch(m) {
    //m.log(`CHURCH: (${m.me.x}, ${m.me.y})`);

    if (m.me.turn === 1) {
        m.log("[CHURCH] Sending Church_built");
        m.castleTalk(encode8("church_built"));
        set_globals(m);
    }
    handle_signal(m);

    determine_mission(m);
    if (m.me.turn === 1) {
        initialize_queue(m);
    }

    // first turn logic
    if (m.require_send_complete && (m.queue.isEmpty() || m.spawned_units === 5)) {
        m.log("[CHURCH] Sending Event_complete");
        m.castleTalk(encode8("event_complete"));
        m.require_send_complete = false;
    }

    let build_opts = open_neighbors_diff(m, m.me.x, m.me.y);
    let unit = pick_unit(m);
    if (unit !== undefined) {
        let leftover_k = m.karbonite - unit_cost(unit.unit)[0];
        let leftover_f = m.fuel - unit_cost(unit.unit)[1];
        if (
            build_opts.length > 0 &&
            leftover_k >= 0 && leftover_f >= 0
        ) {
            let build_loc = most_central_loc(m, build_opts);
            //m.log(`BUILD UNIT ${unit.unit} AT (${build_loc[0] + m.me.x}, ${build_loc[1] + m.me.y})`);
            //m.log(`SENDING TASK ${unit.task}`);
            let msg = 0;
            msg = encode16("task", unit.task);
            if (msg !== 0)
                m.signal(msg, build_loc[0] ** 2 + build_loc[1] ** 2);
            m.spawned_units++;
            return m.buildUnit(unit.unit, ...build_loc);
        } else {
            //m.log(`FAILED BUILD ATTEMPT: ${JSON.stringify(unit)}`);
            m.queue.push(unit);
        }
    }
    return;
}

export function pick_unit(m) {
    update_queue(m);
    if (!m.queue.isEmpty()) {
        return m.queue.pop();
    }
}

function update_queue(m) {
    // restore pilgrims
    const visible_pilgrims = get_visible_pilgrims(m).length;
    const desired_pilgrims = m.fuel_locs.length + m.karb_locs.length;
    while (getDef(m.queue.unit_count, SPECS.PILGRIM, 0) + visible_pilgrims < desired_pilgrims) {
        m.queue.push(Unit(SPECS.PILGRIM, constants.GATHER, 2));
    }
    // restore defense
    const current_defenders = visible_ally_attackers(m).length;
    let resource_defenders = visible_pilgrims;
    let desired_defenders = resource_defenders + get_additional_defenders(m);
    if (m.mission === constants.DEFEND) {
        desired_defenders += Math.ceil(m.visible_enemies.length * constants.DEFENSE_RATIO);
        if (getDef(m.queue.emergency_task_count, constants.DEFEND, 0) + current_defenders < desired_defenders) {
            // add an emergency defender to the queue
            const defenders = [SPECS.PREACHER, SPECS.PROPHET];
            for (let i = 0; i < defenders.length; i++) {
                let d = defenders[i];
                if (m.karbonite >= unit_cost(d)[0]) {
                    if (i !== defenders.length - 1 && Math.random() > 0.5)
                        continue;
                    m.queue.push(Unit(d, constants.DEFEND, constants.EMERGENCY_PRIORITY + 1));
                    break;
                }
            }
        }
    } else {
        while (getDef(m.queue.task_count, constants.DEFEND_RESOURCES, 0) + current_defenders < resource_defenders) {
            m.queue.push(Unit(SPECS.PROPHET, constants.DEFEND_RESOURCES, 1));
        }
        if (current_defenders > desired_pilgrims) {
            while (getDef(m.queue.task_count, constants.DEFEND, 0) + current_defenders < desired_defenders) {
                m.queue.push(Unit(SPECS.PROPHET, constants.DEFEND, 1));
            }
        }
    }
}

function initialize_queue(m) {
    m.queue.push(Unit(SPECS.PROPHET, constants.DEFEND, 3));
}

function determine_mission(m) {
    let prev_mission = m.mission;
    if (m.visible_enemies.filter(r => r.unit !== SPECS.CASTLE).length > 0) {
        m.mission = constants.DEFEND;
        if (prev_mission !== constants.DEFEND) {
            m.log("I'm under attack!");
        }
    }
    else {
        m.mission = constants.NEUTRAL;
        while (!m.queue.isEmpty()) {
            let unit = m.queue.peek();
            if (unit.priority >= constants.EMERGENCY_PRIORITY && unit.task === constants.DEFEND) {
                m.queue.pop();

            } else {
                break;
            }
        }
    }
}

function handle_signal(m) {
    for (let r of m.visible_allies) {
        if (r.signal !== -1) {
            let message = decode16(r.signal);
            // m.log(`GOT COMMAND ${message.command} (${message.args}) FROM ${r.id}`);
            if (message.command === "task" && message.args[0] === constants.EVENT && m.me.turn <= 2) {
                m.require_send_complete = true;
            }
        }
    }
}

function get_additional_defenders(m) {
    let defenders = 3;
    let stages = [
        { stop: 50, rate: 0 },
        { stop: 100, rate: 0.5 },
        { stop: 200, rate: 1 },
        { stop: 1001, rate: 1.5 }
    ]
    let prev_stop = 0;
    for (let o of stages) {
        let turns = Math.min(m.me.turn, o.stop) - prev_stop;
        if (turns <= 0) continue;
        defenders += Math.floor(Math.floor(turns / 25) * o.rate);
        prev_stop = o.stop;
    }
    return defenders;
}

function set_globals(m) {
    m.queue = new PriorityQueue((a, b) => a.priority > b.priority);
    m.mission = constants.NEUTRAL;
    m.fuel_locs = best_fuel_locs(m);
    m.karb_locs = best_karb_locs(m);
    m.spawned_units = 0;
    m.resource_radius = get_resource_radius(m);
}

function Unit(unit, task, priority) {
    return { unit: unit, task: task, priority: priority };
}

export function unit_cost(b) {
    return [SPECS.UNITS[b].CONSTRUCTION_KARBONITE, SPECS.UNITS[b].CONSTRUCTION_FUEL];
}


