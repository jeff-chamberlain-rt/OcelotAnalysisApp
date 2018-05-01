app.directive('heatmap', function( analysisData ) {
  const worldCenterX = -100.0,
  worldCenterY = -3275.0,
  worldSizeX = 22950.0,
  worldSizeY = 23760.0;

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

    const hexRadius = 20;
    const hexColor = "red";

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
        .attr("d", hexbin.hexagon())
        .style("opacity", 0)
        .attr("fill", "white")
        .attr("transform", function(d) { return "translate(0,0)"; })
      .merge(path)
      .transition()
      .duration(500)
      .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
      .style("opacity", 1)
      .attr("fill", function(d) { return color(d.length); })

    path.exit().transition()
      .duration(500)
      .style("opacity", 0)
      .remove();
  }

  return {
    restrict: 'E',
    scope: {},
    templateUrl: 'heatmap-template.html',
    link: function ( scope ) {
      scope.maxValue = 1;

      scope.$watch(function() {
        return analysisData.getAppliedFilters()
      }, drawHeatMap.bind(scope), true);

      scope.$watch(function() {
        return analysisData.getFilters()
      }, drawHeatMap.bind(scope), true)
    }
  }
});