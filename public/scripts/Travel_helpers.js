//Constants
///////////
const Time_In_Start = 20;


const filterFields = [
"event_type",
"location_x",
"location_y",
"location_z",
"round_seconds",
"app_version",
"round_number",
"player_number",
"player_team"
];

const colorwheel1 = ['#0066ff','#00ccff','#3333cc', '#336699', '#0000cc','#6600ff'];
const colorwheel2 = ['#ff9900','#ff3300','#cc0000','#ffcc66','#ff0066','#cc3300'];

const minRndSecs = 30;
/*
const worldCenterX = -100.0,
	worldCenterY = -3275.0,
	worldSizeX = 22950.0,
	worldSizeY = 23760.0;
*/
	
const worldCenterX = -225.0,
	worldCenterY = -2150.0,
	worldSizeX = 24625.0,
	worldSizeY = 26055.0;
  
const crankWidth = 864,
	crankheight = 900; 
 
 
//Functions
///////////

function getVersions(data){
	var all_data = data;
	var temp = all_data.map(a => a.app_version);
	function onlyUnique(value, index, self) { 
		return self.indexOf(value) === index;
	}

	var unique = temp.filter( onlyUnique );
	return unique;
}


function getAllIndexes(arr, val) {
    var indexes = [], i;
    for(i = 0; i < arr.length; i++)
        if (arr[i] === val)
            indexes.push(i);
    return indexes;
};

function get_rnd_Sums(data){
	var all_data = data;
	
	//get the round end event type for most of the summaries
	var temp = all_data.map(a => a.event_type);
	rnd_end_ndx = temp.indexOf("round_end");
	rnd_end_sums = all_data[rnd_end_ndx];
	
	
	//find the first alien kill
	
	//filter only player deaths
	temp = all_data.map(a => a.event_type);
	trim_ndxs = getAllIndexes(temp,"player_death");
	trim_data = trim_ndxs.map(i => all_data[i]);	
	
	//filter only human deaths
	temp = trim_data.map(a => a.player_team);
	trim_ndxs = getAllIndexes(temp,"Human");
	trim_data = trim_ndxs.map(i => trim_data[i]);
	
	//sort by when they happend and grab the first one
	temp = trim_data.map(a => a.round_seconds);
	alien_kills = temp.sort(function(a,b){return a-b});
	
	console.log(rnd_end_sums, "End_round:", alien_kills);
	return [rnd_end_sums,temp[0]];
}




function get_distinct_players(arr){
	var unique = {};
	var human_players = [];
	arr.forEach(function (x) {
		if (!unique[x.player_name] && (x.player_name != "UNINITIALIZED_PLAYER_NAME" && x.player_name != undefined) && x.player_team == "Human"){
			human_players.push(x.player_name);
			unique[x.player_name] = true;
		}
	});
	alien_players=[];
	unique = {};
	arr.forEach(function (x) {
		if (!unique[x.player_name] && (x.player_name != "UNINITIALIZED_PLAYER_NAME" && x.player_name != undefined) && x.player_team == "Alien"){
			alien_players.push(x.player_name);
			unique[x.player_name] = true;
		}
	});
	//console.log("humans: ",human_players);
	//console.log("aliens: ",alien_players);
	return [human_players,alien_players];
}

function get_distinct_matches(arr){
	var unique = {};
	var distinct = [];
	arr.forEach(function (x) {
		if (!unique[x.match_id] && x.match_id != "UNINITIALIZED_MATCH_ID") {
			distinct.push(x.match_id);
			unique[x.match_id] = true;
		}
	});
	
	return distinct.sort();
}


function get_distinct_rounds(arr){
	var unique = {};
	var distinct = [];
	arr.forEach(function (x) {
		if (!unique[x.round_number]) {
			distinct.push(x.round_number);
			unique[x.round_number] = true;
		}
	});
	return distinct.sort(function(a, b){return a - b});
}

//currently we only consider 8 rounds of playtesting
function toss_rnds(data){
	good=[]
	var ndx = 0
	data.forEach(function (x) {
		if (x.round_number === 1 || x.round_number === 2 || x.round_number === 3 || x.round_number === 4 || x.round_number === 5 || x.round_number === 6 || x.round_number === 7 || x.round_number === 8 || x.round_number === 9) {
			good.push(ndx);
		}
		ndx = ndx + 1;
	});
	return good;
}



function prep_data(data, version){
	var all_data = data;
	var temp = all_data.map(a => a.app_version);
	var trim_ndxs = getAllIndexes(temp, version);
	var trim_data = trim_ndxs.map(i => all_data[i])
	trim_ndxs = toss_rnds(trim_data);
	trim_data = trim_ndxs.map(i => trim_data[i])
	return trim_data;
}

function get_Rnd_Data(data, rnd, match){
	var all_data = data;
	
	//trim data for only that match:
	var temp = all_data.map(a => a.match_id);
	var trim_ndxs = getAllIndexes(temp, match);
	var trim_data = trim_ndxs.map(i => all_data[i]);
	
	//trim data for that round:
	temp = trim_data.map(a => a.round_number);
	trim_ndxs = getAllIndexes(temp, rnd);
	trim_data = trim_ndxs.map(i => trim_data[i]);
	
	
	return trim_data;
}

function Point(x, y, z){
	this.x = x;
	this.y = y;
	this.z = z;
}


function get_cmd_points(data){
	var all_data = data;
	
	//trim data for only cmd point spawns:
	temp = all_data.map(a => a.event_type);
	trim_ndxs = getAllIndexes(temp, "control_point_spawned");
	trim_data = trim_ndxs.map(i => all_data[i]);
	
	//get locations of command points
	var cmd_points = [];
	trim_data.forEach(function (l){
		var p = new Point(l.location_x, l.location_y, l.location_z);
		cmd_points.push([l.event_type,p,"X"]);
	});	
	
	return cmd_points;
}


function get_player_travel(data, name, team, rnd, match){
	var all_data = data;
	
	//trim data for only that player:
	temp = all_data.map(a => a.player_name);
	trim_ndxs = getAllIndexes(temp, name);
	trim_data = trim_ndxs.map(i => all_data[i]);
	
	
	if(team == "Human"){
		//find only events when player is human
		temp = trim_data.map(a => a.player_team);
		trim_ndxs = getAllIndexes(temp, "Human");
		trim_data = trim_ndxs.map(i => trim_data[i]);
	}
	else{
		//find only events when player is alien
		temp = trim_data.map(a => a.player_team);
		trim_ndxs = getAllIndexes(temp, "Alien");
		trim_data = trim_ndxs.map(i => trim_data[i]);		
	}
	
	//get deaths for later use
	//////////////////////////
	temp = trim_data.map(a => a.event_type);
	death_ndxs = getAllIndexes(temp, "player_death");
	death_data = death_ndxs.map(i => trim_data[i]);
	
	//get locations of deaths
	var death_points = [];
	death_data.forEach(function (l){
		var p = new Point(l.location_x, l.location_y, l.location_z);
		death_points.push([l.round_seconds,p,l.player_name]);
	});	
	//console.log("DEATHS:",name,team,death_points);
	//////////////////////////
	
	
	//trim data for only heartbeat events:
	temp = trim_data.map(a => a.event_type);
	trim_ndxs = getAllIndexes(temp, "player_heartbeat");
	trim_data = trim_ndxs.map(i => trim_data[i]);
	
	//get all locations:
	var travel_points = [];
	trim_data.forEach(function (l){
		var p = new Point(l.location_x, l.location_y, l.location_z);
		travel_points.push([l.round_seconds,p,l.is_sprinting]);
	});
	console.log("PATH:",name,team,travel_points);
	
return [travel_points.sort(function(a,b){return a[0]-b[0]}),death_points.sort(function(a,b){return a[0]-b[0]})];


}

function mapPoints(travel_points, imgWidth, imgHeight){
	pathing=[];
	travel_points.forEach(function (p){
			p[1].x = ( (p[1].x - worldCenterX) / worldSizeX )* imgWidth + ( imgWidth/2 );
			p[1].y = ( (p[1].y - worldCenterY) / worldSizeY )* imgHeight + ( imgHeight/2 );
			pathing.push([p[0],new Point(p[1].x,p[1].y,p[1].z,),p[2]]);
	});
	return pathing;
}

