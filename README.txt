

# JSON Input Format
V.0.1 by Przybyslaw S. Paz - 10.10.2025


## Overview
This file defines learning scenarios for BPMN practice.
All fields use camelCase naming.


## Unresolved
- **Canvas Size**: for this version it will be only one workable size, but needs to be resolved what it is.
    - And how you write the attribute
- **Image Formats**: Which formats to support for `tutorialImage` and `failureImage`
    - Candidates: .png, .jpg, .svg, .gif?
    - And in which sizes?
- **JavaScript Operations**: Document which JS operations are safe/supported in `functions.code`
    - Need to decide: Whitelist specific operations or allow all?
    - Consider: Security implications, error handling
- **Completaion of all scenarios**: What happens once you finish all scenarios? Something custom uploaded by JSON or just an exit link?


## Canvas Coordinates
This format uses **web-standard coordinates** with origin at the top-left:
- `x`: Distance from left edge (increases rightward)
- `y`: Distance from top edge (increases downward)
- Origin `(0, 0)` is the top-left corner of the canvas
Example: In a 1200 × 800 canvas, `(100, 50)` places an element 100px from the left and 50px from the top.

## Supported JavaScript Operations

Functions use JavaScript code strings. here are the currently supported patterns:

-

## Structure

- `schemaVersion` (string, required): Schema version number
  - Example: `"1.0"`
  - Used for compatibility checking


- `metadata` (object, required): Information about the file creator
    - `createdBy` (string, required): Name of person who created this file
    - `dateCreated` (string, required): Creation date in ISO 8601 Format
        - Format:  `YYYY-MM-DD`
        - Example: `"2025-10-07"`
    - `lastModified` (string, optional): Last modification date
        - Same format as `dateCreated`
    - `documentVersion` (string, required): Document version number


- `aboutCampaign` (object, required): Global campaign settings
    - `mainTitle` (string, required): Title shown to user
    - `campaignDescription` (string, required): Description of overall scenario
    - `numberOfScenarios` (integer, required): Total count of scenarios
        - Must match actual array length
    - `sequential` (boolean, required): Whether scenarios must be presented and completed in order
        - `true` = must complete in order
        - `false` = can complete in any order
    - `building` (boolean, required): Whether scenarios build on each other.
        - Still requires all elements to be written into each scenario, but checks which ones are already loaded on canvas and loads the rest in the menu.
        - `true` = retain elements from previous scenario
        - `false` = start fresh each time
    - `canvasSize` (object, required): Canvas dimensions in pixels
        - `width` (integer): Width in pixels (default: 1200) 
        - `height` (integer): Height in pixels (default: 800)
    - `followUpCampaign` (string, optional): Path to next campaign
        - Relative path from project root
        - Supported formats: JSON
    - `endScreenText` (string, optional): Text player sees after finishing campaign


- `scenarios` (array, required): List of scenario objects
    - Minimum 1 scenario required
    - Minimum 1 startEvent and 1 endEvent required. These are used by the verifier.
    - Each scenario object contains:
        - `scenarioId` (string, required): Unique identifier
            - Format: `"scenario_N"` where N is the number
            - Must start from scenario_1
        - `scenarioTitle` (string, required): Display name
        - `scenarioDescription` (string, required): Description of overall scenario
        - `tutorialImage` (string, optional): Path to help image
            - Relative path from project root
            - Supported formats: -
        - `failureImage` (string, optional): Path to help image
            - Relative path from project root
            - Supported formats: -
        - `tokens` (array, required): Game tokens with variables
            - Each token object requires:
                - `tokenId` (string, required): Unique token identifier
                    - Format: `"token_N"` where N is the number
                - `type` (string, required): Token type for sorting
                    - Example: `"Passenger"` or `"Mail"`
                - `name` (string, optional): Display name
                - `variables` (object, required): All variables the token holds
                    - Each property is a variable with its name as the key
                    - Multiple and mixed variables are supported in a single object
                    - Values can be:
                        - `boolean`: `true` or `false`
                        - `integer`: `5`, `0`, `-3`
                        - `array`: `[]`, `["item1", 5]`

    - `static` (object, optional): Pre-placed, immovable elements
        - Can be omitted if scenario has no fixed elements
        - If included, contains:
            - `pools` (array, optional): Container elements
                - Each pool object requires:
                    - `poolId` (string, required): Unique pool identifier
                        - Format: `"pool_N"` where N is the number
                    - `name` (string, required): Display name
                    - `coordinates` (object, required): Position on canvas
                        - `x` (integer, required): x coordinates
                        - `y` (integer, required): y coordinates
                    - `size` (object, required): Dimensions
                        - `width` (integer, required): Width in pixels
                        - `height` (integer, required): Height in pixels
            - `lanes` (array, optional): Sub-containers within pools
                - Each lane object requires:
                    - `laneId` (string, required): Unique lane identifier
                        - Format: `"lane_N"` where N is the number
                    - `name` (string, required): Display name
                    - `parentPoolId` (string, required): ID of containing pool
                    - `coordinates` (object, required): Position on canvas
                        - `x` (integer, required): x coordinates
                        - `y` (integer, required): y coordinates
                    - `size` (object, required): Dimensions
                        - `width` (integer, required): Width in pixels
                        - `height` (integer, required): Height in pixels
            - `nodes` (array, optional): Fixed nodes on canvas
                - Each node object requires:
                    - `type` (string, required): Type description
                    - `name` (string, optional): Display name
                    - `nodeId` (string, required): Unique node identifier
                        - Format: `"node_N"` where N is the number
                    - `parentPoolId` (string, optional): ID of containing pool
                    - `parentLaneId` (string, optional): ID of containing lane
                    - `coordinates` (object, required): Position on canvas
                        - `x` (integer, required): x coordinates
                        - `y` (integer, required): y coordinates
                    - `functions` (array, optional): List of functions that node holds
                        - Each function object requires:
                            - `name` (string, required): Descriptive name of the function
                                - Example: `"CheckInTrue"`
                            - `code` (string, required): JavaScript code to execute
                                - Example: `"token.CheckIn = true"`
            - `connectors` (array, optional): Fixed connections on canvas
                - Each node object requires:
                    - `type` (string, required): Type description
                    - `connectorId` (string, required): Unique connector identifier
                        - Format: `"connector_N"` where N is the number
                    - `fromNodeId` (string, required): ID of departure node
                    - `toNodeId` (string, required): ID of arrival node 

    - `dynamic` (array, required): Elements player can put on map
        - Each dynamic element is an object with:
            - `type` (string, required): Type description
                - Currently supported: activity, startEvent, xorGateway, andGateway, incomingAndGateway, endEvent
            - `name` (string, optional): Display name
            - `nodeId` (string, required): Unique node identifier
                - Format: `"node_N"` where N is the number
            - `parentPoolId` (array, optional): IDs of containing pool
                - If omitted then element can be placed anywhere
            - `parentLaneId` (array, optional): IDs of containing lane
                - If omitted then element can be placed anywhere
            - `coordinates` (object, optional): Position on canvas if it starts deployed
                - If omitted, element starts in menu
                - If included `amount` can only be 1
                - If included, contains:
                    - `x` (integer, required): x coordinates
                    - `y` (integer, required): y coordinates
            - `functions` (array, optional): List of functions that node executes
                - Can be empty array if node has no functions
                - Each function object requires:
                    - `name` (string, required): Descriptive name of the function
                        - Example: `"CheckInTrue"`
                    - `code` (string, required): JavaScript code to execute
                        - Example: `"token.CheckIn = true"`
            - `amount` (integer, required): How many of them are available to the player.
                - 0 denotes an infinite amount