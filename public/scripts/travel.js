	
var app = angular.module('OcelotAnalysisApp', []);

app.controller("OcelotAnalysisController1", function($scope, $http) {
	var all_Data=[];
	var trim_data=[];
	var game_data=[];
    $http.get('/data').then(function(response) {
		all_Data = response.data;
		console.log(response.data);
		vers = getVersions(response.data);
		console.log(vers);
		var versions = vers.sort(function(a,b){
			asubdex = a.indexOf('d') + 1;
			bsubdex = b.indexOf('d') + 1;
			return -a.substring(asubdex).localeCompare(b.substring(bsubdex));
		});
		$scope.vers = versions;
    });
	
	$scope.selectedAliens=[];
	$scope.selectedHumans=[];
	$scope.showMe1 = false;
	$scope.showMe2 = false;
	$scope.showPlayers = false;
	$scope.myFunc1 = function(){
		if($scope.selectedVer){
			$scope.showMe1 = !$scope.showMe1;
			trim_data = prep_data(all_Data, $scope.selectedVer);
			console.log(trim_data);
			$scope.rounds = get_distinct_rounds(trim_data);
			$scope.matches = get_distinct_matches(trim_data);
			$scope.test = "<3";
		}
	}
	
	
	$scope.update_players = function(){
		if($scope.selectedRound && $scope.selectedMatch){
				$scope.showPlayers = !$scope.showPlayers;
				$scope.selectedAliens=[];
				$scope.selectedHumans=[];
				game_data = get_Rnd_Data(trim_data, $scope.selectedRound, $scope.selectedMatch);
				var res = get_distinct_players(game_data);
				$scope.humans = res[0];
				$scope.aliens = res[1];
		}
	}
	
	
	$scope.myFunc2 = function(){
		if(($scope.selectedHumans || $scope.selectedAliens) && $scope.selectedRound && $scope.selectedMatch){
			$scope.showMe2 = !$scope.showMe2;
			//draw the canvas 
			function make_Map(){
				var canvas = document.getElementById("mapCanvas");
				var ctx = canvas.getContext("2d");
				var img = document.getElementById("Crank")
				ctx.drawImage(img,10,10);
				ctx.save();
				return [ctx, img];
			}
			
			
			//draw the travel paths for an individual....
			function drawTravels(player_paths, ctx, img, count, player, team, death_secs){

				pathing = mapPoints(player_paths, img.width, img.height);
				if(pathing === undefined || pathing.length == 0){
					console.log("player has no paths...");
					return;
				}
				//choose color:
				if(team == "Human"){
					ctx.strokeStyle= colorwheel1[count];
					ctx.fillStyle= colorwheel1[count];
				}
				else{
					ctx.strokeStyle= colorwheel2[count];
					ctx.fillStyle= colorwheel2[count];
				}
				
				
				//start 15 seconds in so they have teleported in
				var i;
				var death = false;
				//start one heartbeat (5sec intervals) after start
				for (i = Time_In_Start/5 + 1; i< pathing.length; i++){
					var t=pathing[i-1][0];
					var p=pathing[i][1];
					var secs = pathing[i][0];
					
					
					//if sprinting needs dashed if not start at default
					if(pathing[i][2] == "true"){
						//player has sprinted to the next point
						console.log("player sprinted:",t);
						ctx.setLineDash([5, 3]);
					}
					else{
						ctx.setLineDash([]);
					}
					
					//start a path between two points
					ctx.beginPath();	
					ctx.moveTo(pathing[i-1][1].x,pathing[i-1][1].y);
					
					//plot heartbeats
					ctx.arc(p.x,p.y,10,0,2*Math.PI);
					
					//if alien we do not want to connect points where the alien has died
					if(team == "Alien"){
						console.log("loc:","(",p.x,",",p.y,")","time:",t,"HB:",i);
						death_secs.forEach( function(ds){
							if( t - 3.5 <= ds && t+3.5 >= ds){
								console.log("Player died on HB:",i);
								death = true;
							}
						});
						if(death){
							death = false;
							continue;
							
						}
					}
					//connect the line
					ctx.lineTo(p.x,p.y);
					ctx.font="15px Arial";
					msg = ""+secs;
					ctx.fillText(msg,p.x-7.5,p.y+7.5);
					ctx.stroke();
					ctx.closePath();
					
				}
				ctx.restore();
			}; 
			
			function plotSpecials(spec_list, ctx, img, type){
				spec_points = mapPoints(spec_list,img.width,img.height);
				console.log("ploting spec_points...");
				ctx.restore();
				ctx.font="20px Impact";
				ctx.fillStyle = "#33cc33";
				spec_list.forEach( function (specs){
					p = specs[1];
					console.log("CP:","(",p.x,",",p.y,")");
					ctx.fillText("CP",p.x-7.5,p.y+7.5);
				});
				ctx.restore();
			}
			
		
			function  plotDeath(death_list, ctx, img, count, team){
				death_points = mapPoints(death_list, img.width, img.height);
				death_secs=[];
				cnt=1;
				death_points.forEach(function (death){
					dp = death[1];
					ctx.font = "60px Arial";
					if(team == "Human"){
						ctx.fillStyle = colorwheel1[count];
					}
					else{
						ctx.fillStyle = colorwheel2[count];
					}
					ctx.fillText("X",dp.x,dp.y);
					death_secs.push(death[0]);
					
					ctx.font = "30px Arial";
					ctx.fillStyle = "black";
					ctx.fillText(""+cnt,dp.x+7.75,dp.y-7.75);
					cnt = cnt +1;
					
				});
				ctx.restore();
				return death_secs; 
			};
			
			
			var drawer = make_Map();
			var count = 0;
			$scope.selectedHumans.forEach(function (player){
				res = get_player_travel(game_data, player, "Human", $scope.selectedRound, $scope.selectedMatch);
				player_paths = res[0];
				death_points = res[1];
				death_secs = plotDeath(death_points, drawer[0], drawer[1], count,"Human");
				drawTravels(player_paths, drawer[0], drawer[1], count, player, "Human",  death_secs);
				count = count +1;
			});
			count = 0;
			$scope.selectedAliens.forEach(function (player){
				res = get_player_travel(game_data, player, "Alien", $scope.selectedRound, $scope.selectedMatch);
				player_paths = res[0];
				death_points = res[1];
				death_secs = plotDeath(death_points, drawer[0], drawer[1], count,"Alien");
				drawTravels(player_paths, drawer[0], drawer[1], count, player, "Alien", death_secs);
				count = count +1;
			});
			spec_list = get_cmd_points(game_data);
			plotSpecials(spec_list, drawer[0],drawer[1], "CMD");
			
			
			res = get_rnd_Sums(game_data);
			$scope.Rnd_result = "N/A";
			$scope.rnd_survivors = "N/A";
			$scope.rnd_falkt = "N/A";
			if(res[0] != undefined){
				$scope.Rnd_result = res[0].elimination_victory;
				$scope.rnd_survivors = res[0].surviving_humans;
				$scope.rnd_falkt = res[1];
			}
		}
	}
	
	
	//refresh button
	$scope.RefreshFunc = function(){
		$scope.update_players();
		$scope.myFunc2();
		$scope.selectedRound = undefined;
		$scope.selectedMatch = undefined;

	}
});




