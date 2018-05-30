#!/bin/bash
time=$(mongo Ocelot --eval 'db.getCollection("analytics").find({}, {"event_timestamp": 1, "_id": 0}).sort({"event_timestamp": -1}).limit(1).shellPrint()' -quiet | jq -r '.event_timestamp')
echo "latest document: $time"
local=$(printf "/home/rtgames/OcelotAnalysisApp/data/%s.csv" "$time")
queryid=$(aws athena start-query-execution --query-execution-context Database=ocelot_analytics_database --query-string "SELECT * FROM ocelot_analytics_stack_us_east_1_telemetry_data WHERE event_timestamp > $time" --result-configuration OutputLocation=s3://aws-athena-query-results-us-east-1-746891288394 | jq -r '.QueryExecutionId|tostring')
echo "query id: $queryid"
status="SUBMITTED"
while [ $status = "SUBMITTED" ] || [ $status = "RUNNING" ]
do
	echo "checking query status"
	output=$(aws athena get-query-execution --query-execution-id $queryid | jq '.')
	echo "$output"
	status=$(echo $output | jq -r '.QueryExecution.Status.State|tostring')
	loc=$(echo $output | jq -r '.QueryExecution.ResultConfiguration.OutputLocation|tostring')
	echo "new status: $status"
done
echo "S3 Location: $loc"
if [ $status = "SUCCEEDED" ]
then
	local=$(printf "/home/rtgames/OcelotAnalysisApp/data/%s.csv" "$time")
	aws s3 cp $loc $local
	mongoimport --db Ocelot --collection analytics --file $local --type csv --headerline --ignoreBlanks
else
	echo "downloading query results failed"
fi
