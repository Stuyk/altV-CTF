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
const centerPoint = {
	x: 978.0,
	y: -3040.0,
	z: 5.8923
}
const defaultWeapons = [
	-853065399,
	1198879012,
	-1466123874,
	911657153, // Stun
	615608432 // Molotov
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
var blueFlagColshape = new alt.ColshapeCylinder(blueFlag.x, blueFlag.y, blueFlag.z - 50, 2, 300);
blueFlagColshape.team = 'blue';
blueFlagColshape.flagdrop = false;
var redFlagColshape = new alt.ColshapeCylinder(redFlag.x, redFlag.y, redFlag.z - 50, 2, 300);
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
	alt.emitClient(player, 'loadModel', 's_m_y_clown_01');
	alt.emitClient(player, 'loadModel', 's_m_y_pestcont_01');

	player.model = 'mp_m_freemode_01';
	
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
	UpdateTeamCount();
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
		player.teamPrefix = '{0000FF}';

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
		UpdateTeamCount();
		return;
	}

	if (teamName === 'red') {
		console.log(`${player.name} has joined the red team.`);
		chat.broadcast(`${player.name} has joined the red team.`);
		player.model = 'mp_m_freemode_01';
		player.team = 'red';
		player.teamPrefix = '{FF0000}';

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
		UpdateTeamCount();
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
		player.model = 's_m_y_clown_01';
	} else {
		player.model = 's_m_y_pestcont_01';
		if (pos !== undefined) {
			player.spawn(pos.x, pos.y, pos.z, 100);
		} else {
			const randomPos = RandomPosAround(redSpawn, 20);
			player.spawn(randomPos.x, randomPos.y, randomPos.z, 100);
		}
		player.model = 's_m_y_pestcont_01';
	}	

	player.health = 200;
	player.dead = false;

	setTimeout(() => {
		giveWeapons(player);
	}, 150);
}

function leaveTeam(player) {
	dropFlag(player);
	
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

	UpdateTeams();
}

function playerDeathEvent(player, killer) {
	// Stop team killing.
	if (player.team === killer.team) {
		respawnPlayer(player, player.pos);
		return;
	}

	chat.broadcast(`${player.teamPrefix}${player.name}{FFFFFF} was killed by ${killer.teamPrefix}${killer.name}`);
	
	// Regular death.
	player.dead = true;
	
	// Don't go further if the player does not have the flag.
	dropFlag(player);

	setTimeout(() => {
		respawnPlayer(player);
	}, 5000);
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
		alt.emitClient(null, 'playAudio', 'red_flag_dropped');
		redFlagDrop = dropPosition;
		chat.broadcast(`{0000FF}${player.name}{FFFFFF} has dropped the {FF0000}red {FFFFFF}flag.`);
	} else {
		alt.emitClient(null, 'playAudio', 'blue_flag_dropped');
		blueFlagDrop = dropPosition;
		chat.broadcast(`{FF0000}${player.name}{FFFFFF} has dropped the {0000FF}blue {FFFFFF}flag.`);
	}

	setTimeout(() => {
		let flagDropColshape = new alt.ColshapeCylinder(dropPosition.x, dropPosition.y, dropPosition.z - 100, 1, 300);
		flagDropColshape.flagdrop = true;
		flagDropColshape.team = teamInfo;
	}, 2000);
}

function giveWeapons(player) {
	player.removeAllWeapons();
	
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
			alt.emitClient(null, 'playAudio', 'red_flag_returned');
			isRedFlagAvailable = true;
			colshape.destroy();
			redFlagDrop = undefined;
			alt.emitClient(null, 'removeFlagDrop', 'red');
			chat.broadcast(`{FF0000}${entity.name}{FFFFFF} has returned the {FF0000}red {FFFFFF}flag.`);
			// Remove flag locally
		} else {
			// Blue team is picking up the flag.
			alt.emitClient(null, 'playAudio', 'red_flag_taken');
			isRedFlagAvailable = false;
			entity.flag = true;
			redFlagDrop = undefined;
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
			alt.emitClient(null, 'playAudio', 'blue_flag_returned');
			isBlueFlagAvailable = true;
			colshape.destroy();
			blueFlagDrop = undefined;
			alt.emitClient(null, 'removeFlagDrop', 'blue');
			chat.broadcast(`{0000FF}${entity.name}{FFFFFF} has returned the {0000FF}blue {FFFFFF}flag.`);
			// Remove flag locally
		} else {
			// Red team is picking up the flag.
			alt.emitClient(null, 'playAudio', 'blue_flag_taken');
			isBlueFlagAvailable = false;
			entity.flag = true;
			blueFlagDrop = undefined;
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
			alt.emitClient(null, 'playAudio', 'blue_flag_taken');
			alt.emitClient(null, 'hasFlag', entity, 'red');
			isBlueFlagAvailable = false;
			entity.flag = true;
			chat.broadcast(`{FF0000}${entity.name}{FFFFFF} has grabbed the {0000FF}blue {FFFFFF}flag.`);
		}

		// Score Blue Flag; only when the red flag is available.
		if (colshape.team === 'red' && entity.flag && !isBlueFlagAvailable && isRedFlagAvailable) {
			alt.emitClient(null, 'playAudio', 'red_team_score');
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
			alt.emitClient(null, 'playAudio', 'red_flag_taken');
			alt.emitClient(null, 'hasFlag', entity, 'blue');
			isRedFlagAvailable = false;
			entity.flag = true;
			chat.broadcast(`{0000FF}${entity.name}{FFFFFF} has grabbed the {FF0000}red {FFFFFF}flag.`);
		}

		// Score Red Flag; only when blue flag is available.
		if (colshape.team === 'blue' && entity.flag && !isRedFlagAvailable && isBlueFlagAvailable) {
			alt.emitClient(null, 'playAudio', 'blue_team_score');
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

function Distance(vector1, vector2) {
	if (vector1 === undefined || vector2 === undefined) {
		throw new Error('AddVector => vector1 or vector2 is undefined');
	}
	return Math.sqrt(Math.pow(vector1.x - vector2.x, 2) + Math.pow(vector1.y - vector2.y, 2) + Math.pow(vector1.z - vector2.z, 2));
}

function UpdateTeamCount() {
	var redCount = 0;
	var blueCount = 0;
	
	alt.Player.all.forEach((target) => {
		if (target.team === 'red') {
			redCount += 1;
		}

		if (target.team === 'blue') {
			blueCount += 1;
		}
	});

	alt.emitClient(null, 'updateTeamCount', redCount, blueCount);
	UpdateTeams();
}

function UpdateTeams() {
	const redTeamMembers = [];
	const blueTeamMembers = [];

	alt.Player.all.forEach((target) => {
		if (target.team === 'red') {
			redTeamMembers.push(target);
		}

		if (target.team === 'blue') {
			blueTeamMembers.push(target);
		}
	});

	redTeamMembers.forEach((redPlayer) => {
		alt.emitClient(redPlayer, 'updateTeams', redTeamMembers);
	});

	blueTeamMembers.forEach((bluePlayer) => {
		alt.emitClient(bluePlayer, 'updateTeams', blueTeamMembers);
	});
}

chat.registerCmd('showmenu', (player) => {
	alt.emitClient(player, 'showMenu');
});

chat.registerCmd('teams', (player) => {
	var redCount = 0;
	var blueCount = 0;
	
	alt.Player.all.forEach((target) => {
		if (target.team === 'red') {
			redCount += 1;
		}

		if (target.team === 'blue') {
			blueCount += 1;
		}
	});

	chat.send(player, `${redCount} Red Players | ${blueCount} Blue Players`);
});

setInterval(() => {
	alt.Player.all.forEach((target) => { 
		target.setWeather(2);
		target.setDateTime(1, 1, 2019, 12, 0, 0);

		if (Distance(target, centerPoint) >= 350) {
			target.pos = centerPoint;
			chat.send(`{FF0000} Stay within the area.`);
		}
	});
}, 30000);
