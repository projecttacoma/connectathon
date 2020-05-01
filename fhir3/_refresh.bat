@ECHO OFF
SET tooling_jar=tooling-1.0.4-SNAPSHOT-jar-with-dependencies.jar
SET input_cache_path=%~dp0input-cache
SET ig_resource_path=%~dp0/input/connectathon.xml
rem measure_to_refresh_path=%~dp0/input/resources/measure/measure-EXM104_FHIR3-8.1.000.json

ECHO Checking internet connection...
PING tx.fhir.org -n 1 -w 1000 | FINDSTR TTL && GOTO isonline
ECHO We're offline...
SET fsoption=
GOTO igpublish

:isonline
ECHO We're online, setting publish to the Connectathon sandbox FHIR server
SET fsoption=-fs http://cqm-sandbox.alphora.com/cqf-ruler-dstu3/fhir/

:igpublish

SET JAVA_TOOL_OPTIONS=-Dfile.encoding=UTF-8

IF EXIST "%input_cache_path%\%tooling_jar%" (
	ECHO running: JAVA -jar "%input_cache_path%\%tooling_jar%" -RefreshIG -ip=%~dp0 -igrp="%ig_resource_path%" -iv=fhir3 -t -d -p -v %fsoption%
	JAVA -jar "%input_cache_path%\%tooling_jar%" -RefreshIG -ip=%~dp0 -igrp="%ig_resource_path%" -iv=fhir3 -t -d -p -v %fsoption%

rem	ECHO running: JAVA -jar "%input_cache_path%\%tooling_jar%" -RefreshIG -ip=%~dp0 -igrp="%ig_resource_path%" -mtrp="%measure_to_refresh_path%" -iv=fhir3 -t -d -p -v %fsoption%
rem	JAVA -jar "%input_cache_path%\%tooling_jar%" -RefreshIG -ip=%~dp0 -igrp="%ig_resource_path%" -mtrp="%measure_to_refresh_path%" -iv=fhir3 -t -d -p -v %fsoption%
) ELSE If exist "..\%tooling_jar%" (
	ECHO running: JAVA -jar "..\%tooling_jar%" -RefreshIG -ip=%~dp0 -igrp="%ig_resource_path%" -iv=fhir3 -t -d -p -v %fsoption%
	JAVA -jar "..\%tooling_jar%" -RefreshIG -ip=%~dp0 -igrp="%ig_resource_path%" -iv=fhir3 -t -d -p -v %fsoption%

rem	ECHO running: JAVA -jar "..\%tooling_jar%" -RefreshIG -ip=%~dp0 -igrp="%ig_resource_path%" -mtrp="%measure_to_refresh_path%" -iv=fhir3 -t -d -p -v %fsoption%
rem	JAVA -jar "..\%tooling_jar%" -RefreshIG -ip=%~dp0 -igrp="%ig_resource_path%" -mtrp="%measure_to_refresh_path%" -iv=fhir3 -t -d -p -v %fsoption%
) ELSE (
	ECHO IG Refresh NOT FOUND in input-cache or parent folder.  Please run _updateRefreshIG.  Aborting...
)

PAUSE
