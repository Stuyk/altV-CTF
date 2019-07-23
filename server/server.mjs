import * as alt from 'alt';
import * as chat from 'chat';

const redTeam = [];
const blueTeam = [];
const redSpawn = {
	x: 978.0,
	y: -3115.0,
	z: 5.8923
}
const redFlag = {
	x: 978.0,
	y: -3125.0,
	z: 5.8923
}
const blueSpawn = {
	x: 978.0,
	y: -2956.0,
	z: 5.8923
}
const blueFlag = {
	x: 978.0,
	y: -2946.0,
	z: 5.8923
}
const defaultWeapons = [
	-853065399,
	1198879012,
	-1466123874
]

// Flag States
var isBlueFlagAvailable = true;
var isRedFlagAvailable = true;

// Team Scores
var redScore = 0;
var blueScore = 0;

// Flag Locations
var blueFlagDrop = undefined;
var redFlagDrop = undefined;

// Players holding the flags
var hasBlueFlag = undefined;
var hasRedFlag = undefined;

// Flag Colshapes
var blueFlagColshape = new alt.ColshapeSphere(blueFlag.x, blueFlag.y, blueFlag.z, 2);
blueFlagColshape.team = 'blue';
blueFlagColshape.flagdrop = false;
var redFlagColshape = new alt.ColshapeSphere(redFlag.x, redFlag.y, redFlag.z, 2);
redFlagColshape.team = 'red';
redFlagColshape.flagdrop = false;

// Server Events
alt.on('playerConnect', joinServer);
alt.on('playerDisconnect', leaveTeam);
alt.on('playerDeath', playerDeathEvent);
alt.on('playerDamage', instantKill);
alt.on('entityEnterColshape', enterFlagzone);

// Client Events
alt.onClient('joinTeam', joinTeam);
alt.onClient('dropFlag', dropFlag);

// Functions
function joinServer(player) {
	player.flag = false;
	alt.emitClient(player, 'showMenu');
	alt.emitClient(player, 'addPlaceholder', 'red', redFlag);
	alt.emitClient(player, 'addPlaceholder', 'blue', blueFlag);

	// Sync up flag holding on join.
	alt.emitClient(player, 'hasFlag', hasBlueFlag, 'blue');
	alt.emitClient(player, 'hasFlag', hasRedFlag, 'red');

	// Sync up flag drops for blue.
	if (blueFlagDrop !== undefined) {
		alt.emitClient(player, 'addFlagDrop', 'blue', blueFlagDrop);
	}

	// Sync up flag drops for red.
	if (redFlagDrop !== undefined) {
		alt.emitClient(player, 'addFlagDrop', 'red', redFlagDrop);
	}

	updateScores();
}

function joinTeam(player, teamName) {
	// Team switch handle for flag.
	if (player.flag) {
		dropFlag(player);
	}
	
	if (teamName === 'blue') {
		console.log(`${player.name} has joined the blue team.`);
		chat.broadcast(`${player.name} has joined the blue team.`);
		player.model = 'mp_m_freemode_01';
		player.team = 'blue';

		if (!blueTeam.includes(player)) {
			blueTeam.push(player);
		}

		if (redTeam.includes(player)) {
			const redTeamIndex = redTeam.findIndex(x => x === player);
			if (redTeamIndex !== -1) {
				redTeam.splice(redTeamIndex, 1);
			}
		}

		respawnPlayer(player);
		return;
	}

	if (teamName === 'red') {
		console.log(`${player.name} has joined the red team.`);
		chat.broadcast(`${player.name} has joined the red team.`);
		player.model = 'mp_m_freemode_01';
		player.team = 'red';

		if (!redTeam.includes(player)) {
			redTeam.push(player);
		}

		if (blueTeam.includes(player)) {
			const blueTeamIndex = blueTeam.findIndex(x => x === player);
			if (blueTeamIndex !== -1) {
				blueTeam.splice(blueTeamIndex, 1);
			}
		}

		respawnPlayer(player);
		return;
	}
}

function respawnPlayer(player, pos) {
	if (player.team === 'blue') {
		player.model = 's_m_y_clown_01';
		if (pos !== undefined) {
			player.spawn(pos.x, pos.y, pos.z, 100);
		} else {
			const randomPos = RandomPosAround(blueSpawn, 20);
			player.spawn(randomPos.x, randomPos.y, randomPos.z, 100);
		}
	} else {
		player.model = 's_m_y_pestcont_01';
		if (pos !== undefined) {
			player.spawn(pos.x, pos.y, pos.z, 100);
		} else {
			const randomPos = RandomPosAround(redSpawn, 20);
			player.spawn(randomPos.x, randomPos.y, randomPos.z, 100);
		}
	}	

	player.health = 200;
	player.dead = false;

	setTimeout(() => {
		giveWeapons(player);
	}, 150);
}

function leaveTeam(player) {
	// Remove from red team.
	if (redTeam.includes(player)) {
		const redIndex = redTeam.findIndex(target => target === player);

		if (redIndex !== -1) {
			redTeam.splice(redIndex, 1);
		}
	}

	// Remove from blue team.
	if (blueTeam.includes(player)) {
		const blueIndex = blueTeam.findIndex(target => target === player);

		if (blueIndex !== -1) {
			blueTeam.splice(blueIndex, 1);
		}
	}
}

function playerDeathEvent(player, killer) {
	// Stop team killing.
	if (player.team === killer.team) {
		respawnPlayer(player, player.pos);
		return;
	}
	
	// Regular death.
	player.dead = true;
	
	setTimeout(() => {
		respawnPlayer(player);
	}, 5000);
	
	// Don't go further if the player does not have the flag.
	dropFlag(player);
}

function dropFlag(player) {
	if (!player.flag)
		return;
	
	// Flag drop information
	const dropPosition = player.pos;
	const teamInfo = (player.team === 'red' ? 'blue' : 'red'); // Opposite team flag.
	
	player.flag = false;
	alt.emitClient(null, 'addFlagDrop', teamInfo, dropPosition);

	if (teamInfo === 'red') {
		redFlagDrop = dropPosition;
		chat.broadcast(`{0000FF}${player.name}{FFFFFF} has dropped the {FF0000}red {FFFFFF}flag.`);
	} else {
		blueFlagDrop = dropPosition;
		chat.broadcast(`{FF0000}${player.name}{FFFFFF} has dropped the {0000FF}blue {FFFFFF}flag.`);
	}

	setTimeout(() => {
		let flagDropColshape = new alt.ColshapeSphere(dropPosition.x, dropPosition.y, dropPosition.z, 1);
		flagDropColshape.flagdrop = true;
		flagDropColshape.team = teamInfo;
	}, 2000);
}

function giveWeapons(player) {
	defaultWeapons.forEach((hash) => {
		player.giveWeapon(hash, 999, true);
	});
}

function instantKill(player, attacker) {
	if (player === attacker)
		return;

	if (attacker === null || attacker === undefined)
		return;

	// Stop team damage.
	if (player.team === attacker.team) {
		player.health = 200;
		return;
	}

	player.health = 0;
}

function updateScores() {
	alt.emitClient(null, 'updateScore', redScore, blueScore);
}

function enterFlagzone(colshape, entity) {
	if (entity.team === undefined)
		return;

	if (entity.dead)
		return;

	// Handle red flag drop.
	if (colshape.flagdrop && colshape.team === 'red') {
		if (entity.team === 'red') {
			// Red team is returning their flag.
			isRedFlagAvailable = true;
			colshape.destroy();
			alt.emitClient(null, 'removeFlagDrop', 'red');
			chat.broadcast(`{FF0000}${entity.name}{FFFFFF} has returned the {FF0000}red {FFFFFF}flag.`);
			// Remove flag locally
		} else {
			// Blue team is picking up the flag.
			isRedFlagAvailable = false;
			entity.flag = true;
			colshape.destroy();
			alt.emitClient(null, 'removeFlagDrop', 'red');
			alt.emitClient(null, 'hasFlag', entity, 'blue'); // Pickup red flag as blue team.
			chat.broadcast(`{0000FF}${entity.name}{FFFFFF} has intercepted the {FF0000}red {FFFFFF}flag.`);
		}
		return;
	}

	// Handle blue flag drop
	if (colshape.flagdrop && colshape.team === 'blue') {
		if (entity.team === 'blue') {
			// Red team is returning their flag.
			isBlueFlagAvailable = true;
			colshape.destroy();
			alt.emitClient(null, 'removeFlagDrop', 'blue');
			chat.broadcast(`{0000FF}${entity.name}{FFFFFF} has returned the {0000FF}blue {FFFFFF}flag.`);
			// Remove flag locally
		} else {
			// Red team is picking up the flag.
			isBlueFlagAvailable = false;
			entity.flag = true;
			colshape.destroy();
			alt.emitClient(null, 'removeFlagDrop', 'blue');
			alt.emitClient(null, 'hasFlag', entity, 'red'); // Pick up blue flag as red team.
			chat.broadcast(`{FF0000}${entity.name}{FFFFFF} has intercepted the {0000FF}blue {FFFFFF}flag.`);
		}
		return;
	}

	if (entity.team === 'red' && !entity.dead) {
		// Grab Blue Flag
		if (colshape.team === 'blue' && isBlueFlagAvailable) {
			alt.emitClient(null, 'hasFlag', entity, 'red');
			isBlueFlagAvailable = false;
			entity.flag = true;
			chat.broadcast(`{FF0000}${entity.name}{FFFFFF} has grabbed the {0000FF}blue {FFFFFF}flag.`);
		}

		// Score Blue Flag
		if (colshape.team === 'red' && entity.flag && !isBlueFlagAvailable) {
			alt.emitClient(null, 'scoredFlag', 'blue');
			entity.flag = false;
			isBlueFlagAvailable = true;
			chat.broadcast(`{FF0000}${entity.name}{FFFFFF} has scored the {0000FF}blue {FFFFFF}flag.`);
			redScore += 1;
			updateScores();
		}
	} else if (entity.team === 'blue' && !entity.dead) {
		// Grab Red Flag
		if (colshape.team === 'red' && isRedFlagAvailable) {
			alt.emitClient(null, 'hasFlag', entity, 'blue');
			isRedFlagAvailable = false;
			entity.flag = true;
			chat.broadcast(`{0000FF}${entity.name}{FFFFFF} has grabbed the {FF0000}red {FFFFFF}flag.`);
		}

		// Score Red Flag
		if (colshape.team === 'blue' && entity.flag && !isRedFlagAvailable) {
			alt.emitClient(null, 'scoredFlag', 'red');
			entity.flag = false;
			isRedFlagAvailable = true;
			chat.broadcast(`{0000FF}${entity.name}{FFFFFF} has scored the {FF0000}red {FFFFFF}flag.`);
			blueScore += 1;
			updateScores();
		}
	}
}

function RandomPosAround(pos, range) {
	if (pos === undefined || range === undefined) {
		throw new Error('RandomPosAround => pos or range is undefined');
	}

	return {
		x: pos.x + (Math.random() * (range * 2)) - range,
		y: pos.y + (Math.random() * (range * 2)) - range,
		z: pos.z
	};
}

chat.registerCmd('tpblue', (player) => {
	player.pos = blueSpawn;
});

chat.registerCmd('tpred', (player) => {
	player.pos = redSpawn;
});

chat.registerCmd('showmenu', (player) => {
	alt.emitClient(player, 'showMenu');
});