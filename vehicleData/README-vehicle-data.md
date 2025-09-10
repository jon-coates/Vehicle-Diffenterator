# NAVI Data Overview

This document provides a structured overview of how vehicle data is organised in the NAVI dataset. It is intended to guide developers, designers, and data integrators when working with the data model and displaying vehicle specifications.

---

## Data Structure

Each make/model file contains two primary objects:

- `meta`: Provides pagination information (number of pages/items in the query).
- `data`: An array of vehicles, each representing a specific version or trim.

Vehicles can be further subcategorised by `trim`. If `trim` is blank, it should be referred to as **base**. Individual vehicles are identified by a unique `uniqueId` and a more human-readable `versionName`.

The `vehicle` object is where the bulk of the specifications for each version are stored.

---

## Display Name

The display name is provided in `vehicle.modelDetails.displayNameFull`. This should always be used when displaying the make and model of the vehicle, rather than combining them manually. This avoids duplication issues such as:

- **Bad**: `Mazda Mazda2` (from concatenating `vehicle.make` + `vehicle.model`)
- **Good**: `Mazda 2` (`vehicle.modelDetails.displayNameFull`)

---

## Standard Text

The `standardText` object is **never** to be used when displaying specs on a vehicle. It is for **internal checking purposes only**.

---

## Key Information

The beginning of the `vehicle` object contains consistent fields that help identify and categorise the vehicle.

**Identifiers**

- `publicId`
- `vehicleId`
- `uniqueId`
- `versionName`

**Classification**

- `make`
- `model`
- `trim`
- `modelYear`
- `modelDescriptor`
- `vehicleType`
- `bodyType`
- `jatoRegionalSegment`

**Technical Specs**

- `numberOfDoors`
- `transmissionType`
- `transmissionNumberOfSpeeds`
- `transmissionDescription`
- `engineLiters`
- `engineConfiguration`
- `engineNumberOfCylinders`
- `drivenWheels`

**Dates**

- `modelIntroducedDate`
- `modelConcludeDate`
- `versionIntroducedDate`

**Commercial**

- `fuelType`
- `price`
- `powertrainType`
- `isCurrent`
- `hasEvData`

---

## Detailed Specification Sections

Each vehicle object may contain any of the following subobjects, which store detailed specifications. Not all vehicles will contain every subobject, and some may be empty. Commonly used ones include `engine`, `dimensions`, and `safety`.

- `audio`
- `bodyExterior`
- `brakes`
- `bumpers`
- `cargoArea`
- `convenience`
- `dimensions`
- `doors`
- `emergency`
- `engine`
- `fuel`
- `hybridAndElectricSystems`
- `instrumentation`
- `interiorTrim`
- `lights`
- `locks`
- `paint`
- `performance`
- `roof`
- `safety`
- `seats`
- `service`
- `steering`
- `storage`
- `suspension`
- `transmission`
- `ventilation`
- `version`
- `visibility`
- `warranty`
- `weatherProtection`
- `weights`
- `wheels`

---

## Images

The dataset contains image references, but these are currently out of scope for integration. They may be revisited in future work.

