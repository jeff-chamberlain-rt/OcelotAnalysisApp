//Draw logic
function drawCommandPoints(ctx, res){
	ref = 1;
	cmdTable = [];
	res.forEach(function(cmdInfo){
		p = cmdInfo.loc;
		ctx.fillStyle = 'white';
		ctx.font = "25px Arial";
		ctx.fillText( "CP" + ref, p.x - 7.5, p.y + 7.5 );
		cmdTable.push([ref, cmdInfo.secs, cmdInfo.extra[0], cmdInfo.extra[1]]);
		ref +=1;
	});
	
	return cmdTable;
}


function drawHuman(ctx, img, res, cnt){	
	spawnPnt = res[2][0]; //there's only one point for humans
	travelPnts = res[0];
	deathPnt = res[1][0]; //there's only one point for humans
	player = res[3];
	//set distinct color
	ctx.font = "50px Arial";
	ctx.fillStyle = colorWheel[cnt];
	
	//plot spawn
	ctx.fillText( "S", spawnPnt.loc.x, spawnPnt.loc.y);
	spawnSec = spawnPnt.secs;
	ctx.beginPath( );
	ctx.moveTo(spawnPnt.loc.x, spawnPnt.loc.y);
	
	//plot travel
	skip=0;
	sprint = false;
	travelPnts.forEach(function (pInfo){
		p = pInfo.loc;
		if(p.x < img.width && p.y < img.height){
			//plot every heartbeat with a small circle
			ctx.arc( p.x,p.y,2,0,2*Math.PI );
				
			//plot seconds on every 3rd beat
			if(skip > 3){
				skip=0;
				ctx.font = "15px Arial Black";
				msg = "" + pInfo.secs;
				ctx.fillText( msg,p.x-7.5,p.y+7.5 )
			}
			else{
				skip+=1;
			}
			
			//check for sprinting
			if(sprint!=pInfo.extra){
				sprint = pInfo.extra;
				ctx.setLineDash( [ 5, 3 ] );
			}
			else {
				ctx.setLineDash( [ ] );
			}
			
			//connect line to points
			ctx.strokeStyle = colorWheel[cnt];
			ctx.lineTo( p.x,p.y );
			ctx.stroke( );	
		}
		
	});

	//plot death
	if(deathPnt){
		ctx.font = "60px Arial";
		ctx.strokeStyle = colorWheel[cnt];
		ctx.fillText( "X", deathPnt.loc.x, deathPnt.loc.y );
		msg = "" + player + " " + deathPnt.secs;
	}
	else{
		msg = "" + player;
	}
	//Show Color Key:
	ctx.font = "15px Arial";
	ctx.fillStyle = colorWheel[cnt];	
	ctx.fillText( msg, 10, 30 + cnt * 15 );
	
}


//Controller and directives:

app.controller("OcelotAnalysisController", function ($scope, $http, analysisData) {
	function initData() {
		$http.get('/data').then(function(response) {
			console.log('DATA RECEIVED');
			analysisData.setData ( response.data );
			$scope.Versions = analysisData.getVersions();
			console.log('Versions determined');
			$scope.evalLeaders = false;
		});
	}
	
	console.log('Fetching Data...');
	initData();
	
	//initialize the map
	var canvas = document.getElementById( "mapCanvas" );
	var ctx = canvas.getContext( "2d" );
	ctx.save();	
	
	//we want to always clear children when we update the scope
	function clearRound(){
		document.getElementById("CheckRound").checked = false;
		document.getElementById("RoundSummary").style.display = "none";
		$scope.selectedHumans=[];
		$scope.selectedAliens=[];
		$scope.cmdInfoTable = undefined;
		ctx.clearRect(0, 0, canvas.width, canvas.height);
	}
	function clearMatch(){
		document.getElementById("CheckMatch").checked = false;
		document.getElementById("MatchSummary").style.display = "none";
		$scope.selectedRound = undefined;
		clearRound()
	}
	function clearVersion(){
		document.getElementById("CheckVersion").checked = false;
		document.getElementById("VersionSummary").style.display = "none";
		$scope.selectedMatch = undefined;
		$scope.selectedRound = undefined;
		clearMatch();		
	}
	function clearChildren(parentName){
		switch(parentName){
			case 'version': clearVersion(); break;
			case 'match': clearMatch(); break;
			case 'round': clearRound(); break;
		}	
	}

	$scope.setVersion = function( ){
		analysisData.setVersion($scope.selectedVersion);
		clearChildren('version');
	}
	
	$scope.setLB = function( ){
		if($scope.fromVersion && $scope.toVersion){
			console.log('From: ',$scope.fromVersion);
			console.log('To: ',$scope.toVersion);
			analysisData.setLeaderBoard( $scope.fromVersion, $scope.toVersion)
		}
	}
	
	$scope.getMatches = function(){
		return analysisData.getMatches();
	}
	
	$scope.setMatch = function( ){
		analysisData.setMatch($scope.selectedMatch);
		clearChildren('match');
	}
	
	$scope.getRounds = function(){
		return analysisData.getRounds();
	}
	
	$scope.getPlayers = function() {
		return analysisData.getPlayers();
	}
	
	$scope.setRound = function( ){
		analysisData.setRound($scope.selectedRound);
		clearChildren('round');
	}
	
	$scope.showVersionSummary = function() {
		var checkBox = document.getElementById("CheckVersion");
		var vSum = document.getElementById("VersionSummary");
		if (checkBox.checked == true) {
			vSum.style.display = "block";
		} else {
			vSum.style.display = "none";
		}
	}
	
	$scope.showMatchSummary = function() {
		var checkBox = document.getElementById("CheckMatch");
		var mSum = document.getElementById("MatchSummary");
		if (checkBox.checked == true) {
			mSum.style.display = "block";;
		} else {
			mSum.style.display = "none";
		}
	}
	
	$scope.showRoundSummary = function() {
		var checkBox = document.getElementById("CheckRound");
		var rSum = document.getElementById("RoundSummary");
		if (checkBox.checked == true) {
			rSum.style.display = "block";
		} else {
			rSum.style.display = "none";
		}
	}
	
	
	$scope.showLeaderBoard = function() {
		var checkBox = document.getElementById("CheckLeaders");
		var lTab = document.getElementById("leaderBoard");
		if (checkBox.checked == true) {
			lTab.style.display = "block";
			$scope.evalLeaders = true;
		} else {
			lTab.style.display = "none";
			$scope.evalLeaders = false;
		}
	}
	
	$scope.showMap = function( ){
		//DropBox commands
		if($scope.selectedHumans.indexOf('Select All') > -1){
			$scope.selectedHumans = analysisData.getPlayers()[0];
		}
		if($scope.selectedAliens.indexOf('Select All') > -1){
			$scope.selectedAliens = analysisData.getPlayers()[1];
		}
		if($scope.selectedHumans.indexOf('Clear') > -1){
			$scope.selectedHumans = [];
		}
		if($scope.selectedAliens.indexOf('Clear') > -1){
			$scope.selectedAliens = [];
		}
		
		
		//DrawMap Logic
		var map = analysisData.getMap();
		switch( map ) {
			case 'Ocelot_Map_Crank': var img = document.getElementById( "Crank" ); break;
			case 'Ocelot_Map_Flux': var img = document.getElementById( "Flux" ); break;
			//default to crank for now....
			default: var img = document.getElementById( "Crank" ); break;
		}
		analysisData.setMapPoints( map );
		ctx.drawImage( img,10,10 );	
		
		//Draw player info
		cnt = 0;
		$scope.selectedHumans.forEach(function (player){
			if(player != 'Select All' && player != 'Clear'){
				res = analysisData.getPlayerInfo(player, 'Human', [img.width,img.height]);
				res.push(player);
				drawHuman(ctx, img, res, cnt);
				cnt+=1;
			}
		});
	
		//plot command points 
		res = analysisData.getCmdInfo([img.width,img.height]);
		$scope.cmdInfoTable = drawCommandPoints(ctx, res);
	}
	
});

app.directive('versionSummary', function(analysisData) {
	console.log(analysisData.getWeapon_Data('version'));
	return  {
		templateUrl: 'summary-template.html',
		link: function(scope) {
			scope.summaryTitle = 'Version',
			scope.summarySubTitle = 'Version Matches',
			scope.$watch('selectedVersion',function (){
			scope.Weapon_Data = analysisData.getWeapon_Data('version');
			scope.Game_Data = analysisData.getGame_Data('version');
			})
		}
	}
});

app.directive('matchSummary', function(analysisData) {
	return  {
		templateUrl: 'summary-template.html',
		link: function(scope) {
			scope.summaryTitle = 'Match',
			scope.summarySubTitle = 'Match Rounds',
			scope.$watch('selectedMatch',function (){
			scope.Weapon_Data = analysisData.getWeapon_Data('match');
			scope.Game_Data = analysisData.getGame_Data('match');
			})
		}
	}
});

app.directive('roundSummary', function(analysisData) {
	return  {
		templateUrl: 'summary-template.html',
		link: function(scope) {
			scope.summaryTitle = 'Round',
			scope.summarySubTitle = 'Round',
			scope.$watch('selectedRound',function (){
			scope.Weapon_Data = analysisData.getWeapon_Data('round');
			scope.Game_Data = analysisData.getGame_Data('round');
			})
		}
	}
});

app.directive('ocelotLeaderboard', function(analysisData) {
	return  {
		templateUrl: 'ocelot-leaderboard.html',
		link: function(scope) {
				scope.$watch('evalLeaders',function(){
					scope.leaderTable = analysisData.getLeaderBoard();
					console.log('LB Table: ',scope.leaderTable);
			})
		}
	}
});

