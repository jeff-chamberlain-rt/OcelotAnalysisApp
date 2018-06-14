app.directive('heatmap', function( analysisData ) {
const worldCenterX = -225.0,
	worldCenterY = -2150.0,
	worldSizeX = 24625.0,
	worldSizeY = 26055.0;

  function drawHeatMap () {
    var svg = d3.select("svg"),
    width = svg.attr("width"),
    height = svg.attr("height");

    var data = analysisData.getFilteredData ();
    console.log("FILTERED DATA", data);

    data = data.filter(function(item) {
      return item.location_x && item.location_y;
    });

    data = data.map(function(item) {
      return [
      ( ( ( item.location_x - worldCenterX ) / worldSizeX ) * width ) + (width / 2),
      ( ( ( item.location_y - worldCenterY ) / worldSizeY ) * height) + (height / 2)
      ]
    });

    const hexRadius = this.hexSize;
    const hexColor = this.heatmapColor;

    console.log('HEATMAP COLOR', this.heatmapColor);

    var hexbin = d3.hexbin()
    .radius(hexRadius)
    .extent([[0, 0], [width, height]]);

    var hexbinData = hexbin(data);

    var maxValue = hexbinData.reduce( function ( maxLength, element ) {
      return Math.max ( maxLength, element.length );
    }, 1 );

    console.log('hexbin data', hexbinData);
    console.log ( 'MAX VALUE', maxValue );
    this.maxValue = maxValue;

    var color = d3.scaleSequential(d3.interpolateLab("white", hexColor ) )
    .domain([0, maxValue]);

    var path = d3.select(".hexagon")
      .selectAll("path")
      .data(hexbinData);

    path.enter()
      .append("path")
        .style("opacity", 0)
        .attr("fill", "white")
        .attr("transform", function(d) { return "translate(0,0)"; })
      .merge(path)
      .transition()
      .duration(500)
      .attr("d", hexbin.hexagon())
      .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
      .style("opacity", 1)
      .attr("fill", function(d) { return color(d.length); })

    path.exit().transition()
      .duration(500)
      .style("opacity", 0)
      .remove();

      // Update gradient key
      d3.select('#gradientEnd').transition()
        .duration(500)
        .attr("stop-color", hexColor);
  }

  return {
    restrict: 'E',
    scope: {},
    templateUrl: 'heatmap-template.html',
    controller: ['$scope', function($scope) {
      $scope.heatmapColor = '#ff0000';
      $scope.hexSize = 20;

      $scope.$watch(function() {
        return $scope.heatmapColor
      }, function() {
        drawHeatMap.call($scope);
      });

      $scope.$watch(function() {
        return $scope.hexSize
      }, function() {
        drawHeatMap.call($scope);
      });
    }],
    link: function ( scope ) {
      scope.maxValue = 1;

      scope.$watch(function() {
        return analysisData.getAppliedFilters()
      }, drawHeatMap.bind(scope), true);

      scope.$watch(function() {
        return analysisData.getFilters()
      }, drawHeatMap.bind(scope), true);

      //scope.$watch(scope.heatmapColor, drawHeatMap.bind(scope), true);
    }
  }
});