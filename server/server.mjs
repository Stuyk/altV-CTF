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
	126349499,
	1198879012
]

// Flag States
var isBlueFlagAvailable = true;
var isRedFlagAvailable = true;

// Team Scores
var redScore = 0;
var blueScore = 0;

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

// Functions
function joinServer(player) {
	player.flag = false;
	alt.emitClient(player, 'showMenu');
	alt.emitClient(player, 'addPlaceholder', 'red', redFlag);
	alt.emitClient(player, 'addPlaceholder', 'blue', blueFlag);
}

function joinTeam(player, teamName) {
	if (teamName === 'blue') {
		console.log(`${player.name} has joined the blue team.`);
		player.model = 'mp_m_freemode_01';
		player.team = 'blue';

		if (!blueTeam.includes(player)) {
			blueTeam.push(player);
		}

		if (redTeam.includes(player)) {
			const redTeamIndex = redTeam.findIndex(player);
			if (redTeamIndex !== -1) {
				redTeam.splice(redTeamIndex, 1);
			}
		}

		respawnPlayer(player);
		return;
	}

	if (teamName === 'red') {
		console.log(`${player.name} has joined the red team.`);
		player.model = 'mp_m_freemode_01';
		player.team = 'red';

		if (!redTeam.includes(player)) {
			redTeam.push(player);
		}

		if (blueTeam.includes(player)) {
			const blueTeamIndex = blueTeam.findIndex(player);
			if (blueTeamIndex !== -1) {
				blueTeam.splice(blueTeamIndex, 1);
			}
		}

		respawnPlayer(player);
		return;
	}
}

function respawnPlayer(player) {
	if (player.team === 'blue') {
		player.model = 's_m_y_clown_01';
		player.spawn(blueSpawn.x, blueSpawn.y, blueSpawn.z, 100);
	} else {
		player.model = 's_m_y_pestcont_01';
		player.spawn(redSpawn.x, redSpawn.y, redSpawn.z, 100);
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
		const redIndex = redTeam.findIndex(player);

		if (redIndex !== -1) {
			redTeam.splice(redIndex, 1);
		}
	}

	// Remove from blue team.
	if (blueTeam.includes(player)) {
		const blueIndex = blueTeam.findIndex(player);

		if (blueIndex !== -1) {
			blueTeam.splice(blueIndex, 1);
		}
	}
}

function playerDeathEvent(player, killer) {
	setTimeout(() => {
		respawnPlayer(player);
	}, 5000);
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

	player.health = 0;
	player.dead = true;

	// Don't go further if the player does not have the flag.
	if (!player.flag)
		return;

	player.flag = false;
	let flagDropColshape = new alt.ColshapeSphere(player.pos.x, player.pos.y, player.pos.z, 1);
	flagDropColshape.flagdrop = true;
}

function enterFlagzone(colshape, entity) {
	if (entity.team === undefined)
		return;

	if (entity.dead)
		return;

	// Flagdrop handling add here.

	if (entity.team === 'red' && !player.dead) {
		// Grab Blue Flag
		if (colshape.team === 'blue' && isBlueFlagAvailable) {
			isBlueFlagAvailable = false;
			entity.flag = true;
			chat.broadcast(`{FFFF00}${entity.name}{FFFFFF} has grabbed the {0000FF}blue {FFFFFF}flag.`);
		}

		// Score Blue Flag
		if (colshape.team === 'red' && entity.flag && !isBlueFlagAvailable) {
			entity.flag = false;
			isBlueFlagAvailable = true;
			chat.broadcast(`{FFFF00}${entity.name}{FFFFFF} has scored the {0000FF}blue {FFFFFF}flag.`);
			redScore += 1;
		}
	} else if (entity.team === 'blue' && !player.dead) {
		// Grab Red Flag
		if (colshape.team === 'red' && isRedFlagAvailable) {
			isRedFlagAvailable = false;
			entity.flag = true;
			chat.broadcast(`{FFFF00}${entity.name}{FFFFFF} has grabbed the {FF0000}red {FFFFFF}flag.`);
		}

		// Score Red Flag
		if (colshape.team === 'blue' && entity.flag && !isRedFlagAvailable) {
			entity.flag = false;
			isRedFlagAvailable = true;
			chat.broadcast(`{FFFF00}${entity.name}{FFFFFF} has scored the {FF0000}red {FFFFFF}flag.`);
			blueScore += 1;
		}
	}
}

chat.registerCmd('tpblue', (player) => {
	player.pos = blueSpawn;
});

chat.registerCmd('tpred', (player) => {
	player.pos = redSpawn;
});