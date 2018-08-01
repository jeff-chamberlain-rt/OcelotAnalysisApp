//Constants
const Time_In_Start = 20;

const colorWheel = ['#e6194b','#3cb44b','#ffe119','#0082c8',
					'#f58231','#911eb4','#46f0f0','#f032e6',
					'#d2f53c','#fabebe','#008080','#e6beff',
					'#aa6e28','#fffac8','#800000','#aaffc3'];

//Prototypes:
function playerStats(_kills, _deaths, _totLifetime, _roundsStarted,_lives){
	this.kills = _kills || 0;
	this.deaths = _deaths || 0;
	this.totLifetime = _totLifetime || 0;
	this.roundsStarted = _roundsStarted || 0;
	this.lives = _lives || 0;
}
playerStats.prototype.combineStats = function (s2){
	this.kills += s2.kills;
    this.deaths += s2.deaths;
	this.roundsStarted += s2.roundsStarted;
	this.totLifetime += s2.totLifetime;
	this.lives += s2.lives;
}

function playerHistory(name, played, allHumanStats, allAlienStats){	
	this.player = name;
	this.played = played;
	this.lifetimeHumanStats = allHumanStats;
	this.lifetimeAlienStats = allAlienStats;
}


function Match_Info( Id, m_date ) {
	this.m_Id = Id;
	this.m_date = m_date;
}

function Weapon_Info( name, avg_dam, tot_dam, records ) {
	this.weapon_name = name;
	this.average_damage = avg_dam;
	this.total_damage = tot_dam;
	this.num_records = records;
}

function Round_Summary( rnd_num, rnd_id, overtime, expired, winners, survivors, roundlength, humanDeathCnt, alienDeathCnt, ctrlAct, ctrlCap) {
	this.round_number = rnd_num;
	this.round_id = rnd_id;
	this.expired = expired;
	this.overtime = overtime;
	this.winningTeam = winners;
	this.survivors = survivors;
	this.roundlength = roundlength;
	this.humanDeaths = humanDeathCnt;
	this.alienDeaths = alienDeathCnt;
	this.ctrlAct = ctrlAct;
	this.ctrlCap = ctrlCap;
	
}

function Point( x, y, z ) {
	this.x = x;
	this.y = y;
	this.z = z;
}


function infoPoint( p, s, t){
	this.loc = p;
	this.secs = s;
	this.extra = t;
	/*
		player_heartbeat: extra = is_sprinting
		default: extra = event_type
	*/
}

//Common functions:
function onlyUnique( value, index, self ) {
	if( typeof value != 'String' || !value.includes( 'UNINITIALIZED' ) ) {
		return self.indexOf( value ) === index;
	}
}

function remove(array, element) {
    const index = array.indexOf(element);
    
    if (index !== -1) {
        array.splice(index, 1);
    }
}
/*mapConstants:
mapConstants[0]=worldCenterX
mapConstants[1]=worldCenterY
mapConstants[2]=worldSizeX
mapConstants[3]=worldSizeY

imgConstants:
imgConstants[0]=imgWidth
imgConstants[1]=imgHeight
*/
function extractInfoPoints( data , mapConstants, imgConstants){
	//Map the data to only the important info
	retPoints=[];
	data.forEach( function(d){
		//get the point and map it according to map constants
		actPoint = new Point( d.location_x, d.location_y, d.location_z );
		actPoint.x = ( ( actPoint.x - mapConstants[0]) / mapConstants[2] ) * imgConstants[0] + ( imgConstants[0] / 2 );
		actPoint.y = ( ( actPoint.y - mapConstants[1]) / mapConstants[3] ) * imgConstants[1] + ( imgConstants[1] / 2 );
		mapPoint = new Point(actPoint.x,actPoint.y,actPoint.z);
		
		//map to a infoPoint, extra based on the type of event
		switch(d.event_type){
			case 'player_heartbeat':
				retPoints.push(new infoPoint(mapPoint,d.round_seconds,d.is_sprinting));
			default:
				retPoints.push(new infoPoint(mapPoint,d.round_seconds,d.event_type));
				break;
		}
	});
	//make sure they are sorted
	return retPoints.sort(function(a,b){return a.secs - b.secs});
}

//Define the app:
var app = angular.module( 'OcelotAnalysisApp', ['ngMaterial','ngMessages']);

//Here are all factory functions:
app.factory( 'analysisData', function( ){
	//variables
	var data = [];
	var version = '';
	var versions = [];
	var versionData = [];
	var matchData = [];
	var roundData = [];
	var Matches = [];
	var match = '';
	var Rounds = [];
	var round = '';
	var worldCenterX = 1;
	var worldCenterY = 1;
	var worldSizeX = 1;
	var worldSizeY = 1;
	var lbDict={};
	
	//Setters:
	function setData( _data ){
		data = _data;
		if( !data || data.length == 0 ){
			console.log('ERROR SETTING DATA');
			return;
		}
		console.log('ALL DATA:',data);
		
		
		//Set and sort the possible versions
		temp = _data.map( a => a.app_version );
		var vers = temp.filter( onlyUnique );
		versions = vers.sort( function ( a,b ) {
		//we sort by the string located after the 'd' charecter
		asubdex = a.indexOf( 'd' ) + 1;
		bsubdex = b.indexOf( 'd' ) + 1;
		return -a.substring( asubdex ).localeCompare( b.substring ( bsubdex ) );
		});
		//console.log(versions);
	}
	
	function setVersion(v) {
		version = v;
		
		//When the version is set we also set the game data
		versionData = data.filter(d => d.app_version == version);
		console.log("Trim for version:",v);
		//console.log(versionData);
		
		//get distinct matches for that version
		trim_data = versionData.filter(d => d.event_type == 'match_begin');
		//We only need matchId and timestamp converted to a readable format
		match_timestamps = trim_data.map( a => [ a.match_id, a.event_timestamp ] );
		returnedMatches = [ ]
		match_timestamps.forEach( function( matchTimestamp ) {
			matchDate = new Date( matchTimestamp[ 1 ]*1000 );
			var match = new Match_Info( matchTimestamp[ 0 ], matchDate );
			returnedMatches.push( match );
		});

		Matches = returnedMatches;
	}
	
	function setMatch(m){
		match = m;
		
		//set the new game data
		matchData = data.filter(d => d.match_id == m);
		console.log("Trim for Match:",m);
		//console.log(matchData);
		
		//get distinct rounds for that match:
		//if a round lasts less than or equal to 20 seconds its probably a bug*
		returnedRounds = matchData.filter(d => d.event_type == 'round_end' && d.round_seconds > 20);
		Rounds = returnedRounds.sort( function( a, b ){ return a.round_number - b.round_number });
	}
	
	function setRound(r){
		round = r;
		
		//set new game data
		roundData = data.filter(d => d.round_id == r);
		console.log("Trim for Round:",r);
		//console.log(roundData);
	}
	
	function setMapPoints( map_name ){
		switch( map_name ){
			//Crank:
			case 'Ocelot_Map_Crank':
				worldCenterX = -225.0;
				worldCenterY = -2150.0;
				worldSizeX = 24625.0;
				worldSizeY = 26055.0;
				break;
			
			//Flux:
			case 'Ocelot_Map_Flux':
				worldCenterX = 150;
				worldCenterY = -275;
				worldSizeX = 24600.0;
				worldSizeY = 24200.0;
				break;
		}
	}
	
	function setLeaderBoard( vFrom, vTo ){
		lbDict={};
		//only look at data after a certain version
		vFromNdx = versions.indexOf(vFrom);
		vToNdx = versions.indexOf(vTo);
		if(vToNdx <= vFromNdx){
			ConsideredVersions = versions.slice(vToNdx,vFromNdx+1);
		}
		else{
			console.log('error in slice');
			return 0;
		}
		console.log('Leaderboard verisons: ',ConsideredVersions);
		scopeData = data.filter(a => ConsideredVersions.indexOf(a.app_version) > -1);
		console.log(scopeData);
		
		//get all round ids
		temp = scopeData.map( a => a.round_id );
		var round_ids = temp.filter( onlyUnique );
		remove(round_ids,'UNINITIALIZED_ROUND_ID');
		round_ids.forEach(function (rId){
			//get only events from that round
			usedData = scopeData.filter(a => a.round_id == rId);	
			endRound = usedData.filter(a => a.event_type == 'round_end')[0];
			if(endRound != undefined){
				//find all players and record their information
				temp = usedData.map(a=>a.player_name);
				roundPlayers = temp.filter( onlyUnique );
				remove(roundPlayers, 'UNINITIALIZED_PLAYER_NAME');
				roundPlayers.forEach(function(player){
					if(player){
						//get player data
						humanStats = new playerStats( );
						alienStats = new playerStats( );
						playerData = usedData.filter(a => a.player_name == player);
						
						//get starting team:
						sInfo = playerData.filter(a => a.event_type == 'player_heartbeat').sort(function(a,b){return a.round_seconds-b.round_seconds})[0]
						if(sInfo){
							sTeam = sInfo.player_team;
							schema_version = sInfo.schema_version;
							switch(sTeam){
								case 'Alien': alienStats.roundsStarted += 1; break;
								case 'Human': humanStats.roundsStarted += 1; break;
							}
						}
						//get kills from both sides and deaths	
						humanDeathTime = -1;
						alienLifespans = [];
						
						playerKillData = playerData.filter(a => a.event_type == 'player_kill');
						playerKillData.forEach(function (kill){
							switch(kill.player_team){
								case 'Human': humanStats.kills += 1; break;
								case 'Alien': alienStats.kills += 1;break;
							}
						});	
						playerDeathData = playerData.filter(a => a.event_type == 'player_death');
						playerDeathData.forEach(function (death){
							switch(death.player_team){
								case 'Human': humanStats.deaths += 1; humanDeathTime = death.round_seconds; break;
								case 'Alien': alienStats.deaths += 1; alienLifespans.push(death.player_lifespan); break;
								
							}
						});
						
						//calculate humanlifetime
						if(sTeam == 'Human'){
							humanSpawntime = Time_In_Start; //default spawn in time for humans
							if(humanDeathTime > 0){
									humanStats.totLifetime = humanDeathTime-humanSpawntime;
									humanStats.lives += 1;
							}
							else { //human made it to the end of the round
									humanStats.totLifetime = endRound.round_seconds-humanSpawntime;
									humanStats.lives += 1;
							}
						}
						//calculate alien lifetimes*
						//some deaths (or console command repawns not included)
						//only includes events where 'player_lifespan' is working properly (due to issue above)
						if(schema_version == '0.0.2'){
							alienLifespans.forEach(function(lifespan){
								alienStats.totLifetime += lifespan;
								alienStats.lives += 1;
							});
						}
						
						//if not in the dict add them
						if(!(player in lbDict)){
							lbDict[player] = new playerHistory(player, 1, humanStats, alienStats);
							console.log('NEW PLAYER: ',lbDict[player]);
						}
						else{
							lbDict[player].played +=1;
							lbDict[player].lifetimeHumanStats.combineStats(humanStats);
							lbDict[player].lifetimeAlienStats.combineStats(alienStats);
						}
					}
				});
			}
			else{
				console.log('End round not recorded for:',rId);
			}
		});

	}
	
	//Getters:
	function getLeaderBoard(){
		result = [];
		for( var key in lbDict){
			result.push([key,lbDict[key]]);
		}
		return result;
	}
	
	function getCmdInfo(imgConstants){
		mapConstants = getMapPoints();
		//grab the spawn for their plot
		cmdSpawnData = roundData.filter(d=>d.event_type == 'control_point_spawned');
		
		//grab activation for time
		cmdActivatedData = roundData.filter(d=>d.event_type == 'control_point_activated');
		
		//grab capture time
		cmdCapturedData = roundData.filter(d=>d.event_type == 'control_point_captured');
		
		//map all to info points 
		cmdSpawnInfo = extractInfoPoints( cmdSpawnData , mapConstants, imgConstants);
		cmdActInfo = extractInfoPoints( cmdActivatedData , mapConstants, imgConstants);
		cmdCapInfo = extractInfoPoints( cmdCapturedData , mapConstants, imgConstants);
		
		//Link the info:
		//Build cmd point objects for ploting and summary
		cmdPointInfo = [ ];
		cmdSpawnInfo.forEach( function( a ) {
			p1 = a.loc;
			actTime = "N/A";
			capTime = "N/A";
			cmdCapInfo.forEach( function( b ) {
				p2 = b.loc;
				if( p1.x == p2.x && p1.y == p2.y ) {
					capTime = b.secs;
				}
			});
			cmdActInfo.forEach( function( c ) {
				p3 = c.loc;
				if( p1.x == p3.x && p1.y == p3.y ) {
					actTime = c.secs;
				}
			});
			//secs = spawned, extra = [activation time, captured time]
			cmdPointInfo.push( new infoPoint( p1, a.secs, [actTime,capTime]) );
		});
		
		return cmdPointInfo;
	}
	
	
	function getPlayers(){
		humans = roundData.filter(d=> d.player_team == 'Human');
		aliens = roundData.filter(d=> d.player_team == 'Alien');
		temp = humans.map(a=>a.player_name);
		human_players = temp.filter( onlyUnique );
		temp = aliens.map(a=>a.player_name);
		alien_players = temp.filter( onlyUnique );
		
		return [ human_players, alien_players ];
	}
	
	function getWeapon_Data(sType){
		switch(sType){
			case 'version': usedData = versionData; break;
			case 'match': usedData = matchData; break;
			case 'round': usedData = roundData; break;
		}
		//filter for Human data
		human_data = usedData.filter(d => d.player_team == 'Human');
		
		//filter for player_give_damage and we only want data after starskeys (15 seconds in)
		damage_data = human_data.filter(d=> d.event_type == 'player_give_damage' && d.round_seconds > Time_In_Start);	

		//we only really want what weapons they are using and the damage they dealt
		weapon_data = damage_data.map( a => [ a.damage_causer_class, a.damage_amount ] );
		weapon_dic = { };
		weapon_data.forEach( function( w ) {
			//if weapon not in dictionary yet
			if ( !( w [ 0 ] in weapon_dic ) ) {
				weapon_dic[ w[ 0 ] ] = [ w[ 1 ], 1 ];
			}
			//weapon is in dictionary
			else {
				val = weapon_dic[ w[ 0 ] ][ 0 ];
				cnt = weapon_dic[ w[ 0 ] ][ 1 ];
				weapon_dic[ w[ 0 ] ] = [ val + w[ 1 ], cnt + 1 ];
			}
		});
		weapons=[];
		for ( var key in weapon_dic ) {
			recs = weapon_dic[ key ][ 1 ];
			total = weapon_dic[ key ][ 0 ];
			avg = total / recs;
			weapons.push( new Weapon_Info( key, avg, total, recs ) );
		}
		//console.log(weapons);
		return weapons;
	}

	function getMapPoints(){
		return [worldCenterX,worldCenterY,worldSizeX,worldSizeY];
	}
	
	function getGame_Data(sType){
		switch(sType){
			case 'version': usedData = versionData; break;
			case 'match': usedData = matchData; break;
			case 'round': usedData = roundData; break;
		}
		temp = usedData.map( a => a.round_id );
		distinctRoundIds = temp.filter( onlyUnique );
		Summary = [];
		
		//make sure we only consider valid rounds...
		remove(distinctRoundIds, 'UNINITIALIZED_ROUND_ID');
		distinctRoundIds.forEach(function(round){
			var humanDeathCnt = 0;
			var alienDeathCnt = 0;
			//trim for only that round
			roundData =  usedData.filter(d => d.round_id == round);
			
			//get the round summary for that round
			roundSummarys = roundData.filter(d => d.event_type == 'round_end');
			//if round is really short then it is a bug*

			//get deaths for that round
			roundDeaths = roundData.filter(d => d.event_type == 'player_death');
			roundDeaths.forEach(function(death){
				if( death.player_team == 'Human' ){
					humanDeathCnt += 1;	
				}
				else{
					alienDeathCnt += 1;	
				}
			});
			
			//count control point info:
			ctrlAct = roundData.filter(d => d.event_type == 'control_point_activated').length;
			ctrlCap = roundData.filter(d => d.event_type == 'control_point_captured').length;
			//Skip rounds that are less than 20 seconds long, thats probably a bug*
			if( roundSummarys.length > 0 && roundSummarys[0].round_seconds > 20){
				roundSummary = roundSummarys[0];
				Summary.push( new Round_Summary( roundSummary.round_number, roundSummary.round_id,
					roundSummary.in_overtime, roundSummary.timer_expired, roundSummary.winning_team, 
					roundSummary.surviving_humans, roundSummary.round_seconds, 
					humanDeathCnt, alienDeathCnt, ctrlAct, ctrlCap ) );
			}
		});
		
		return Summary.sort(function(a,b){return a.round_number - b.round_number});
	}
	
	function getData(){
		return data;
	}
	
	function getVersion(v) {
		return version;
	}
	
	function getVersions(){
		return versions;
	}
	
	
	function getMatches(){
		return Matches;
	}
	
	function getRounds(){
		return Rounds;
	}
	
	function getRound(){
		return round;
	}
	function getMatch(){
		return match;
	}
	
	function getPlayerInfo(pName, pTeam, imgConstants){
		usedData = roundData.filter(d=>d.player_name == pName);
		mapConstants = getMapPoints();
		switch(pTeam){
			case 'Human': 
				playerData = usedData.filter(d=>d.player_team == 'Human');
				playerSpawn = usedData.filter(d=>d.event_type == 'player_teleport');
				spawnInfo = extractInfoPoints(playerSpawn, mapConstants, imgConstants);
				break;
			case 'Alien': 
				playerData = usedData.filter(d=>d.player_team == 'Alien');
				playerSpawn = usedData.filter(d=>d.event_type == 'player_spawn');
				spawnInfo = extractInfoPoints(playerSpawn, mapConstants, imgConstants);
				break;				
		}
		hbeatData = playerData.filter(d=>d.event_type == 'player_heartbeat');
		deathData = playerData.filter(d=>d.event_type == 'player_death');
		
		//map each of these so we only have the important info returned
		hbeatInfo = extractInfoPoints(hbeatData, mapConstants, imgConstants);
		deathInfo = extractInfoPoints(deathData, mapConstants, imgConstants);
		
		return [hbeatInfo, deathInfo, spawnInfo];
	}
	function getMap(){
		roundBegin = roundData.filter(d=>d.event_type == 'round_begin');
		return roundBegin[0].map_name;
	}
	
	return {
		'getLeaderBoard': getLeaderBoard,
		'setLeaderBoard': setLeaderBoard,
		'getCmdInfo': getCmdInfo,
		'setMapPoints': setMapPoints,
		'getPlayerInfo': getPlayerInfo,
		'getMap': getMap,
		'getPlayers': getPlayers,
		'getGame_Data': getGame_Data,
		'getWeapon_Data': getWeapon_Data,
		'setRound': setRound,
		'getRound': getRound,
		'getRounds': getRounds,
		'setMatch': setMatch,
		'getMatches': getMatches,
		'getMatch': getMatch,
		'getVersions': getVersions,
		'setVersion': setVersion,
		'getVersion': getVersion,
		'setData': setData,
		'getData': getData		
	}
})