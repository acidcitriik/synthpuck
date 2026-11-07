import { createAIBrain, recordAIHit } from './ai.js';
import {planTimeTransition,advanceTimeTransition} from './time-transition.js';
import {chooseCampaignAITarget} from './ai-execution.js?v=stal-defense-c-20261105';
import {createTacticalMemory,chooseTacticalTarget,registerTacticalHit} from './ai-tactics.js?v=stal-defense-c-20261105';
// Local gameplay simulation. X/Z is the table plane; the Three.js scene is 3D.
// This deliberately does not depend on the renderer or frame rate.
export const DEFAULTS = Object.freeze({
  width: 5.8, length: 10, goalWidth: 2.05,
  paddleRadius: 0.37, puckRadius: 0.17,
  maxSpeed: 8.5, acceleration: 54, brake: 66,
  wallRestitution: 0.94, paddleRestitution: 0.96,
  friction: 0.25, paddleGrip: 0.65, wallFriction: 0.32, gestureTransfer: 0.40, drag: 0.09, spinDrag: 0.32,
  aiSpeed: 6.7, aiAcceleration: 36,
  normalHitMaxSpeed: 16, smashEffectMinSpeed: 14, smashEffectMinIntensity: .5,
  tick: 1 / 120, scoreToWin: 7, serveLimit: 10, returnLimit: 7
});

export const clamp = (x, min, max) => Math.max(min, Math.min(max, x));
export const magnitude = (x, z) => Math.hypot(x, z);
const EPS = 1e-9;
export const MAX_PUCK_SPEED = 28;
function limitPuckSpeed(puck, limit = MAX_PUCK_SPEED) {
  const speed = magnitude(puck.vx, puck.vz);
  if (speed <= limit) return false;
  puck.vx *= limit / speed; puck.vz *= limit / speed;
  return true;
}

// The input controls a target; it never directly sets paddle velocity or power.
// The same acceleration and norm-based speed limits apply to both movement axes.
export function moveToward(p, target, dt, cfg, ai = false) {
  const topSpeed = ai ? cfg.aiSpeed : cfg.maxSpeed;
  const acceleration = ai ? cfg.aiAcceleration : cfg.acceleration;
  const dx = target.x - p.x, dz = target.z - p.z, distance = magnitude(dx, dz);
  const desiredSpeed = Math.min(topSpeed, Math.sqrt(2 * cfg.brake * distance));
  const desiredX = distance > EPS ? dx / distance * desiredSpeed : 0;
  const desiredZ = distance > EPS ? dz / distance * desiredSpeed : 0;
  let ax = desiredX - p.vx, az = desiredZ - p.vz;
  const length = magnitude(ax, az);
  const limit = (distance < .025 ? cfg.brake : acceleration) * dt;
  if (length > limit) { ax *= limit / length; az *= limit / length; }
  p.vx += ax; p.vz += az;
  const speed = magnitude(p.vx, p.vz);
  if (speed > topSpeed) { p.vx *= topSpeed / speed; p.vz *= topSpeed / speed; }
  p.x += p.vx * dt;
  p.z += p.vz * dt;
  const margin = cfg.paddleRadius + .07;
  const boundX = clamp(p.x, -cfg.width / 2 + margin, cfg.width / 2 - margin);
  const boundZ = p.side === -1
    ? clamp(p.z, -cfg.length / 2 + margin, -margin / 2)
    : clamp(p.z, margin / 2, cfg.length / 2 - margin);
  if (p.x !== boundX) p.vx = 0;
  if (p.z !== boundZ) p.vz = 0;
  p.x = boundX; p.z = boundZ;
}

// Direct local input: the player visually reaches the target in the very
// next physics tick, without a motor lag, interpolation or acceleration.
// Contact velocity alone is capped at cfg.maxSpeed, so moving a high-DPI mouse
// cannot create arbitrarily energetic strikes. The paddle is deliberately
// allowed to move farther than vmax*dt; this is an arcade-control trade-off.
export function prepareDirectMove(p, target, dt, cfg) {
  const margin = cfg.paddleRadius + .07;
  const x = clamp(target.x, -cfg.width/2+margin, cfg.width/2-margin);
  const z = clamp(target.z, -cfg.length/2+margin, -margin/2);
  // Ignore sub-nanometric floating-point residue after reaching the target.
  const dx = Math.abs(x-p.x)<1e-9 ? 0 : x-p.x;
  const dz = Math.abs(z-p.z)<1e-9 ? 0 : z-p.z;
  const rawSpeed = magnitude(dx,dz)/dt;
  const factor = rawSpeed > cfg.maxSpeed ? cfg.maxSpeed/rawSpeed : 1;
  return { fromX:p.x, fromZ:p.z, dx, dz,
    vx:dx/dt*factor, vz:dz/dt*factor, distance:magnitude(dx,dz) };
}
export function applyDirectMove(p, move, progress) {
  p.x = move.fromX + move.dx * progress;
  p.z = move.fromZ + move.dz * progress;
  p.vx = move.vx; p.vz = move.vz;
}

// Short motion memory belongs to the physical paddle, never to a mouse event.
// A reversal starts a new stroke; stopping dissipates preparation quickly.
export function updateStroke(p, dt, cfg) {
  const previous = p.stroke ?? {vx:0, vz:0, speed:0, run:0};
  const alpha = 1 - Math.exp(-dt / .035);
  const vx = previous.vx + (p.vx - previous.vx) * alpha;
  const vz = previous.vz + (p.vz - previous.vz) * alpha;
  const speed = magnitude(vx, vz);
  const acceleration = (speed - previous.speed) / dt;
  const aligned = p.vx * previous.vx + p.vz * previous.vz > 0;
  // Only travel at the current pace counts: a slow approach cannot bank power.
  const retention = aligned ? Math.exp(-dt / .10) * Math.min(1, speed / Math.max(previous.speed, EPS)) : 0;
  const run = previous.run * retention + Math.min(magnitude(p.vx,p.vz), cfg.maxSpeed) * dt
    * clamp((speed - 1) / 3, 0, 1);
  const pace = clamp((speed - 1.5) / 4.5, 0, 1);
  const preparation = clamp(run / .30, 0, 1);
  // Acceleration contributes only after actual travel, never as an impulse spike.
  const commitment = clamp(pace * preparation * (1 + .20 * clamp(acceleration / 60, -1, 1)), 0, 1);
  // Measure a short backswing towards the player's own end. Its contribution
  // fades with time, so an old movement cannot be saved for a later strike.
  const backswing = Math.min(.55, (previous.backswing ?? 0) * Math.exp(-dt / .55)
    + Math.max(0, p.vz * (p.side ?? -1)) * dt);
  const approach = clamp(-p.vz * (p.side ?? -1) / 5, 0, 1);
  const smash = clamp(backswing / .22, 0, 1) * approach * commitment;
  p.stroke = {vx,vz,speed,acceleration,run,commitment,backswing,smash};
}

// Collision impulse of a disk against a driven paddle.
// Relative normal velocity controls restitution; tangential velocity creates spin.
// The paddle is motor-driven, so the external motor may supply energy.
export function collidePaddle(puck, paddle, cfg, mode = 'normal') {
  const dx = puck.x - paddle.x, dz = puck.z - paddle.z;
  const minDistance = cfg.puckRadius + cfg.paddleRadius;
  const distance = magnitude(dx, dz);
  if (distance >= minDistance) return false;
  const nx = distance > EPS ? dx / distance : 0;
  const nz = distance > EPS ? dz / distance : -paddle.side;
  puck.x += nx * (minDistance - distance + 1e-5);
  puck.z += nz * (minDistance - distance + 1e-5);
  // Finite drive response: a light nudge transfers only part of the paddle
  // speed, while a deliberate stroke progressively engages the full drive.
  // This models a heavier disk without changing direct pointer positioning.
  const strokeSpeed = magnitude(paddle.vx, paddle.vz);
  const driveBlend = clamp((strokeSpeed - 1.5) / 4.5, 0, 1);
  const commitment = paddle.stroke?.commitment ?? driveBlend * driveBlend * (3 - 2 * driveBlend);
  // A prepared, accelerating forward stroke can hit harder; gentle touches
  // retain their existing response. Future motion never changes a past hit.
  const smash = paddle.stroke?.smash ?? 0;
  const drive = (.45 + .55 * commitment) * (1 + .45 * smash);
  // The measured gesture cannot push after the paddle stops or reverses.
  // Project the filtered speed onto the current movement direction and cap it
  // at the actual speed, so stale momentum cannot supply energy at contact.
  const filteredX = paddle.stroke?.vx ?? paddle.vx;
  const filteredZ = paddle.stroke?.vz ?? paddle.vz;
  const along = strokeSpeed > EPS ? clamp((filteredX * paddle.vx + filteredZ * paddle.vz) / strokeSpeed, 0, strokeSpeed) : 0;
  const driveX = strokeSpeed > EPS ? paddle.vx / strokeSpeed * along * drive : 0;
  const driveZ = strokeSpeed > EPS ? paddle.vz / strokeSpeed * along * drive : 0;
  const relativeNormal = (puck.vx - driveX) * nx + (puck.vz - driveZ) * nz;
  if (relativeNormal >= -EPS) return false;
  // Character abilities alter puck contact ONLY: never paddle position,
  // cursor responsiveness, AI motor speed or the global puck speed caps.
  const skills=paddle.side===-1?cfg.playerSkills:cfg.aiSkills;
  const [power,amorti,effect,counter]=skills??[3,3,3,3];
  const fullRestitution = (mode === 'rigid' ? .99 : mode === 'soft' ? .46
    : mode === 'grip' ? .79 : cfg.paddleRestitution)
    * (mode==='soft'?(1-.06*(amorti-3)):1);
  // Gentle contacts push rather than spring away. Blend continuously into
  // full restitution for deliberate strikes; no minimum launch impulse.
  const contactSpeed = -relativeNormal;
  const touchBlend = clamp((contactSpeed - .35) / 3.65, 0, 1);
  const smoothBlend = touchBlend * touchBlend * (3 - 2 * touchBlend);
  const restitution = fullRestitution * (.12 + .88 * smoothBlend);
  const friction = mode === 'grip' ? .92 : mode === 'soft' ? .60 : cfg.paddleGrip;
  const incoming=Math.max(0,-(puck.vx*nx+puck.vz*nz));
  const driven=Math.max(0,driveX*nx+driveZ*nz);
  const activeShare=driven/(incoming+driven+EPS);
  const contactFactor=1+.045*(power-3)*activeShare+.045*(counter-3)*(1-activeShare);
  const normalImpulse = -(1 + restitution) * relativeNormal * contactFactor;
  puck.vx += normalImpulse * nx;
  puck.vz += normalImpulse * nz;
  const tx = -nz, tz = nx, radius = cfg.puckRadius;
  const tangentialVelocity = (puck.vx - driveX) * tx
    + (puck.vz - driveZ) * tz - puck.spin * radius;
  // Disk inertia I = (1/2)m*r^2; the effective tangential inverse mass = 3/m.
  // A driven paddle carries a lateral stroke through the contact patch.
  // Keep its contribution bounded by contact pressure, including on glancing hits.
  const spinFactor=1+.06*(effect-3);
  const gesture = (driveX * tx + driveZ * tz) * cfg.gestureTransfer * (.25 + .75 * smoothBlend)*spinFactor;
  const tangentImpulse = clamp((-tangentialVelocity / 3 + gesture)*(1+.035*(effect-3)),
    -friction * normalImpulse, friction * normalImpulse);
  puck.vx += tangentImpulse * tx;
  puck.vz += tangentImpulse * tz;
  puck.spin -= 2 * tangentImpulse / radius;
  // High outgoing speeds require a prepared smash, regardless of player or AI.
  // Blend the limit for qualified strokes instead of a sudden power jump.
  const smashPower = clamp((smash - cfg.smashEffectMinIntensity) / (1 - cfg.smashEffectMinIntensity), 0, 1);
  const speedLimit = cfg.normalHitMaxSpeed + (MAX_PUCK_SPEED - cfg.normalHitMaxSpeed) * smashPower;
  const capped = limitPuckSpeed(puck, speedLimit);
  if (smash >= cfg.smashEffectMinIntensity && magnitude(puck.vx, puck.vz) >= cfg.smashEffectMinSpeed) puck.smashActive = true;
  if (magnitude(puck.vx, puck.vz) < cfg.smashEffectMinSpeed) puck.smashActive = false;
  puck.lastImpact = { mode, normal: normalImpulse, tangent: tangentImpulse, capped, smash, speedLimit };
  return true;
}

// Apply friction impulse when the puck touches a rail.
// The resulting spin changes the angle of a subsequent rail bounce.
function bounceRail(p, normalAxis, normalSign, cfg) {
  const radius = cfg.puckRadius;
  const impactVelocity = Math.abs(normalAxis === 'x' ? p.vx : p.vz);
  if (normalAxis === 'x') p.vx = -normalSign * impactVelocity * cfg.wallRestitution;
  else p.vz = -normalSign * impactVelocity * cfg.wallRestitution;
  const tangentialVelocity = normalAxis === 'x'
    ? p.vz - normalSign * p.spin * radius
    : p.vx + normalSign * p.spin * radius;
  const maxFrictionImpulse = cfg.wallFriction * (1 + cfg.wallRestitution) * impactVelocity;
  const impulse = clamp(-tangentialVelocity / 3, -maxFrictionImpulse, maxFrictionImpulse);
  if (normalAxis === 'x') {
    p.vz += impulse;
    p.spin -= normalSign * 2 * impulse / radius;
  } else {
    p.vx += impulse;
    p.spin += normalSign * 2 * impulse / radius;
  }
  limitPuckSpeed(p);
}

export function collideWalls(p, cfg) {
  const xLimit = cfg.width / 2 - cfg.puckRadius;
  if (p.x > xLimit) {
    p.x = xLimit;
    if (p.vx > 0) bounceRail(p, 'x', 1, cfg);
  }
  if (p.x < -xLimit) {
    p.x = -xLimit;
    if (p.vx < 0) bounceRail(p, 'x', -1, cfg);
  }
  const zLimit = cfg.length / 2 - cfg.puckRadius;
  if (Math.abs(p.z) > zLimit) {
    // A goal is an actual opening in the end rail.
    if (Math.abs(p.x) <= cfg.goalWidth / 2 - cfg.puckRadius) {
      return p.z > 0 ? -1 : 1;
    }
    if (p.z > zLimit) {
      p.z = zLimit;
      if (p.vz > 0) bounceRail(p, 'z', 1, cfg);
    } else {
      p.z = -zLimit;
      if (p.vz < 0) bounceRail(p, 'z', -1, cfg);
    }
  }
  return 0;
}

// Gameplay event threshold, not a physics dead-zone. Very small impulses are
// solver corrections during a sustained push; they still move the puck but
// must not trigger a fresh hit sound or increment rally statistics.
export const MIN_REPORTED_IMPULSE = .01;
export function isReportableImpact(impact) {
  return Number.isFinite(impact?.normal) && impact.normal >= MIN_REPORTED_IMPULSE;
}

export class Match {
  constructor(overrides = {}) {
    this.cfg = { ...DEFAULTS, ...overrides };
    this.player = { x: 0, z: -3.8, vx: 0, vz: 0, side: -1 };
    this.ai = { x: 0, z: 3.8, vx: 0, vz: 0, side: 1 };
    this.aiBrain = createAIBrain();
    this.aiTacticRound=0;
    this.aiBrain.tactical=createTacticalMemory(0);
    this.aiSmash = {phase:"idle", next:0};
    this.target = { x: 0, z: -3.8 };
    this.puck = { x: 0, z: 0, vx: 0, vz: 0, spin: 0, angle: 0, smashActive: false, lastImpact: null }; // visible pre-serve rest position
    this.scores = [0, 0];
    this.state = 'ready';
    this.server = 0; // neutral opening: both paddles contest the centre
    this.awaitingServe = false;
    this.serveStartedAt = 0;
    this.possessionSide = 0;
    this.possessionSince = null;
    this.time = 0;
    this.hits = 0;
    this.rally = 0;
    this.peakSpeed = 0;
    this.input = { left: false, right: false, leftPressed: -Infinity, rightPressed: -Infinity };
    this.events = [];
    this.timeTransition = null;
  }
  reset() { Object.assign(this, new Match({ ...this.cfg })); }
  serve() {
    if (this.state === 'over') return;
    // Opening at midfield, then a stationary puck on the awarded server's half.
    // Neither player nor AI receives a pre-programmed impulse.
    this.puck.x = 0; this.puck.z = this.server * 2.35;
    this.puck.vx = 0; this.puck.vz = 0;
    this.puck.spin = 0; this.puck.angle = 0; this.puck.smashActive = false; this.puck.lastImpact = null;
    Object.assign(this.player, { x: 0, z: -3.8, vx: 0, vz: 0 });
    Object.assign(this.ai, { x: 0, z: 3.8, vx: 0, vz: 0 });
    Object.assign(this.target, { x: 0, z: -3.8 });
    this.player.stroke = null; this.ai.stroke = null;
    // Keep the just-finished rally available for diagnostics after seamless
    // goal/violation restarts. The next serve still gets a fresh live log.
    if(this.roundLog && this.roundLog.endTime!==undefined)
      this.lastRoundLog=this.roundLog;
    if (this.cfg.telemetry) this.roundLog = {schema:1, units:{distance:'table unit',time:'second',speed:'table unit/s',spin:'rad/s',impulse:'per unit puck mass',force:'not measured; contact duration is not modeled'},config:{...this.cfg},startTime:this.time,initialScores:[...this.scores],samples:[],contacts:[],peakSpeed:0,truncated:false};
    this.rally = 0; this.state = 'playing';
    this.awaitingServe = true;
    this.serveStartedAt = this.time;
    this.possessionSide = 0;
    this.possessionSince = null;
    const priorRead=this.aiBrain?.tactical?.human;
    this.aiBrain = createAIBrain();
    this.aiBrain.tactical=createTacticalMemory(this.aiTacticRound++);
    // HAL carries observed paddle habits between rallies. Only public player
    // movement survives, never privileged puck knowledge or shot outcomes.
    if(this.cfg.aiStyle==='adaptive'&&priorRead)
      this.aiBrain.tactical.human={
        ...priorRead,x:this.player.x,time:this.time,
        lateralSpeed:priorRead.lateralSpeed*.75
      };
    this.aiSmash = {phase:"idle", next:0};
    this.events.length = 0;
  }
  setButton(key, down) {
    if (key !== 'left' && key !== 'right') return;
    if (down && !this.input[key]) this.input[key + 'Pressed'] = this.time;
    this.input[key] = down;
  }
  impactMode() {
    if (this.input.left && this.input.right) return 'grip';
    if (this.input.left) return 'rigid';
    if (this.input.right) return 'soft';
    return 'normal';
  }
  logContact(event,offset=0){
    if(this.roundLog.contacts.length<20000)this.roundLog.contacts.push({time:this.time-this.cfg.tick+offset,...event});
    else this.roundLog.truncated=true;
  }
  record(event) {
    this.events.push({ ...event, time: this.time });
    if (this.events.length > 100) this.events.shift();
  }
  chooseSmashTarget(fallback) {
    const state=this.aiSmash, p=this.puck, ai=this.ai, cfg=this.cfg;
    const speeds={guard:5,bruiser:4.2,banker:3.8,rush:3.5,showboat:3.2,erratic:4,adaptive:2.5};
    const safe=p.z>1.0 && p.z<3.55 && magnitude(p.vx,p.vz)<1.3;
    if(state.phase==='idle' && this.time>=state.next && safe && Math.abs(ai.x-p.x)<.6 && ai.z>p.z+.5){
      const retreat=Math.min(cfg.length/2-cfg.paddleRadius-.08, Math.max(ai.z+.45,p.z+1.35));
      if(retreat>ai.z+.20){state.phase='retreat';state.target=retreat;state.started=this.time;}
    }
    if(state.phase!=='idle' && (!safe || this.time-state.started>2.5)){
      state.phase='idle';state.next=this.time+(speeds[cfg.aiStyle]??4);return fallback;
    }
    if(state.phase==='retreat'){
      if(ai.z>=state.target-.12 && ai.vz<1.2)state.phase='strike';
      else return {x:p.x,z:state.target};
    }
    if(state.phase==='strike')return {x:p.x,z:Math.max(cfg.paddleRadius+.08,p.z-.5)};
    return fallback;
  }
  awardServe(reason, offender) {
    // TIME is a real handover state: no score, no teleport, no gameplay collisions.
    if (this.roundLog) Object.assign(this.roundLog, {
      endTime:this.time,result:'timeout',reason,offender,
      scores:[...this.scores],hits:this.rally
    });
    this.server=-offender;
    this.timeTransition=planTimeTransition(this,this.server);
    this.timeTransition.reason=reason;
    this.state='time-transition';
    this.puck.vx=0;this.puck.vz=0;this.puck.spin=0;
    this.player.vx=0;this.player.vz=0;this.ai.vx=0;this.ai.vz=0;
    this.setButton('left',false);this.setButton('right',false);
    this.record({type:'timeout',reason,offender,nextServer:this.server,scores:[...this.scores]});
  }
  finishTimeTransition() {
    const transition=this.timeTransition;
    if(!transition)return;
    const puck={x:this.puck.x,z:this.puck.z};
    const player={x:this.player.x,z:this.player.z};
    const ai={x:this.ai.x,z:this.ai.z};
    // Reinitialize rally/AI/timers just as for an ordinary serve, while
    // restoring the *visible* last animation positions in the same tick.
    this.serve();
    Object.assign(this.puck,{...puck,vx:0,vz:0,spin:0});
    Object.assign(this.player,{...player,vx:0,vz:0});
    Object.assign(this.ai,{...ai,vx:0,vz:0});
    Object.assign(this.target,player);
    this.timeTransition=null;
  }
  tick() {
    if (this.state === 'time-transition') {
      this.time += this.cfg.tick;
      if(advanceTimeTransition(this,this.cfg.tick))this.finishTimeTransition();
      return;
    }
    if (this.state !== 'playing') return;
    const cfg = this.cfg, dt = cfg.tick, puck = this.puck;
    this.time += dt;
    let goal = 0;
    // A player command has zero artificial following delay. Sweep between
    // old and new positions so the disk cannot teleport THROUGH the puck.
    const direct = prepareDirectMove(this.player, this.target, dt, cfg);
    const remote = this.remoteTarget ? prepareDirectMove(
      {x:-this.ai.x,z:-this.ai.z}, this.remoteTarget, dt, cfg) : null;
    const maxMovement = Math.max(magnitude(puck.vx,puck.vz)*dt,
      cfg.aiSpeed*dt, direct.distance, remote?.distance ?? 0);
    const steps = clamp(Math.ceil(maxMovement / (cfg.puckRadius * .30)), 1, 128);
    const step = dt / steps;
    // A one-tick pointer jump may be much faster than the simulated puck.
    // Stop the paddle at the FIRST physical overlap instead of allowing
    // subsequent sweep substeps to carry it through to the puck's far side.
    // Unobstructed motions retain the existing zero-lag direct control.
    let playerContactStop = false;
    const contactRadiusSquared = (cfg.puckRadius + cfg.paddleRadius) ** 2;
    for (let k = 0; k < steps; k++) {
      if (!playerContactStop) applyDirectMove(this.player, direct, (k+1)/steps);
      else { this.player.vx = 0; this.player.vz = 0; }
      let aiTarget = this.awaitingServe && this.server === 1
        ? { x: puck.x, z: Math.max(cfg.paddleRadius + .08, puck.z - .52) }
        : this.awaitingServe && this.server === 0
          ? { x: puck.x, z: cfg.paddleRadius + .08 } // free central claim, physical hit only
          : chooseCampaignAITarget(puck, this.ai, this.player, cfg, this.aiBrain, this.time);
      let aiMode='normal';
      // On an AI service the stationary puck is a real opportunity for a
      // visible controlled possession. Banker/showboat favour it; HAL alternates
      // it with the existing powerful serve, never deleting the SMASH mechanic.
      const tacticalServe=this.awaitingServe&&this.server===1&&
        (Boolean(cfg.aiTactic)||cfg.aiStyle==='banker'||cfg.aiStyle==='showboat'||
          (cfg.aiStyle==='adaptive'&&this.aiTacticRound%2===1));
      if(!remote && cfg.aiStyle && (!this.awaitingServe||tacticalServe)){
        const remaining=this.awaitingServe
          ?Math.max(0,cfg.serveLimit-(this.time-this.serveStartedAt))
          :this.possessionSide===1&&this.possessionSince!==null
            ?Math.max(0,cfg.returnLimit-(this.time-this.possessionSince)):cfg.returnLimit;
        // A controlled AI service should showcase the entire possession
        // sequence, rather than silently skipping it because of the round's
        // rotating technique index. Explicit diagnostic overrides still win.
        const tacticalCfg=tacticalServe&&!cfg.aiTactic
          ? {...cfg,aiTactic:'rallyBank'} : cfg;
        aiTarget=chooseTacticalTarget(puck,this.ai,this.player,tacticalCfg,this.aiBrain,this.time,aiTarget,remaining);
        aiMode=aiTarget.mode??'normal';
      }
      if (!remote && cfg.aiStyle && !this.aiBrain.tactical?.active) aiTarget = this.chooseSmashTarget(aiTarget);
      if(remote){const p={};applyDirectMove(p,remote,(k+1)/steps);Object.assign(this.ai,{x:-p.x,z:-p.z,vx:-p.vx,vz:-p.vz});}
      else moveToward(this.ai, aiTarget, step, cfg, true);
      updateStroke(this.player, step, cfg);
      if (remote || cfg.aiStyle) updateStroke(this.ai, step, cfg);
      puck.angle = ((puck.angle ?? 0) + puck.spin * step) % (2 * Math.PI);
      puck.x += puck.vx * step;
      puck.z += puck.vz * step;
      for (const [paddle, label, mode] of [
        [this.player, 'player', this.impactMode()],
        [this.ai, 'ai', remote?(this.remoteMode??'normal'):aiMode]
      ]) {
        // Detect contact even when the impulse is separating (no bounce).
        // Otherwise a huge touchpad gesture can silently pass through.
        if (label === 'player' && direct.distance > EPS && !playerContactStop) {
          const dx = puck.x - paddle.x, dz = puck.z - paddle.z;
          if (dx*dx + dz*dz < contactRadiusSquared) playerContactStop = true;
        }
        const before = this.roundLog ? {...puck} : null;
        if (collidePaddle(puck, paddle, cfg, mode)) {
          const reported = isReportableImpact(puck.lastImpact);
          if (this.roundLog) {
            const dot=before.vx*puck.vx+before.vz*puck.vz;
            const lengths=magnitude(before.vx,before.vz)*magnitude(puck.vx,puck.vz);
            // Preserve all real contacts for analysis, including tiny corrections.
            this.logContact({type:'paddle',by:label,mode,reported,before,after:{...puck},paddle:{...paddle,stroke:paddle.stroke?{...paddle.stroke}:null},directionChangeDegrees:lengths>EPS?Math.acos(clamp(dot/lengths,-1,1))*180/Math.PI:null,impulse:{...puck.lastImpact}},k*step);
          }
          if (this.awaitingServe) {
            this.awaitingServe = false;
            this.record({ type: 'serve', by: label });
          }
          // Only meaningful strike events drive audio, rally statistics and
          // AI possession memory. This does not change collision impulses.
          if (reported) {
            this.hits++; this.rally++;
            if(label==='ai'){
              recordAIHit(this.aiBrain,this.time);
              if(!remote&&cfg.aiStyle){
                const shot=registerTacticalHit(this.aiBrain,puck,this.time);
                if(shot)this.record({type:'ai-tactic',by:'ai',...shot});
              }
              if(this.aiSmash.phase!=='idle'){this.aiSmash.phase='idle';this.aiSmash.next=this.time+4;}
            }
            this.record({ type: 'impact', by: label, ...puck.lastImpact, speed:magnitude(puck.vx,puck.vz) });
          }
          puck.lastImpact = null;
        }
      }
      const beforeRail=this.roundLog?{...puck}:null;
      const railVx=puck.vx,railVz=puck.vz;
      goal = collideWalls(puck, cfg);
      if(railVx!==puck.vx||railVz!==puck.vz)this.record({type:'rail',speed:magnitude(railVx,railVz)});
      if(beforeRail&&(beforeRail.vx!==puck.vx||beforeRail.vz!==puck.vz))this.logContact({type:'rail',before:beforeRail,after:{...puck},deltaVelocity:{x:puck.vx-beforeRail.vx,z:puck.vz-beforeRail.vz},deltaSpin:puck.spin-beforeRail.spin},k*step);
      if(this.roundLog)this.roundLog.peakSpeed=Math.max(this.roundLog.peakSpeed,magnitude(puck.vx,puck.vz));
      if (magnitude(puck.vx,puck.vz) < cfg.smashEffectMinSpeed) puck.smashActive = false;
      if (goal) break;
      puck.vx *= Math.exp(-cfg.drag * step);
      puck.vz *= Math.exp(-cfg.drag * step);
      puck.spin *= Math.exp(-cfg.spinDrag * step);
      if (magnitude(puck.vx,puck.vz) < cfg.smashEffectMinSpeed) puck.smashActive = false;
    }
    if(this.roundLog){
      const log=this.roundLog;
      if(log.samples.length<72000)log.samples.push({time:this.time,puck:{...puck},player:{...this.player,stroke:this.player.stroke?{...this.player.stroke}:null},ai:{...this.ai},target:{...this.target},mode:this.impactMode()});else log.truncated=true;
    }
    if (goal) {
      const scorer = goal === 1 ? 1 : 0;
      this.scores[scorer]++;
      if(this.roundLog)Object.assign(this.roundLog,{endTime:this.time,scorer,scores:[...this.scores],hits:this.rally});
      this.record({ type: 'goal', scorer, smash: Boolean(puck.smashActive), scores: [...this.scores] });
      this.server = goal > 0 ? -1 : 1;
      this.state = Math.max(...this.scores) >= cfg.scoreToWin ? 'over' : 'ready';
      return;
    }
    if (this.awaitingServe) {
      // The first centre duel has no service timer.
      if (this.server !== 0 && this.time - this.serveStartedAt >= cfg.serveLimit - EPS)
        this.awardServe('serve', this.server);
    } else {
      // Only crossing the median renews the 7s clock; rail bounces and
      // repeated hits on one half never do.
      const side = puck.z > EPS ? 1 : puck.z < -EPS ? -1 : 0;
      if (side !== 0 && side !== this.possessionSide) {
        this.possessionSide = side;
        this.possessionSince = this.time;
      }
      if (side !== 0 && this.possessionSince !== null &&
          this.time - this.possessionSince >= cfg.returnLimit - EPS)
        this.awardServe('return', side);
    }
    const speed = magnitude(puck.vx, puck.vz);
    this.peakSpeed = Math.max(this.peakSpeed, speed);
    limitPuckSpeed(puck);
  }
}
