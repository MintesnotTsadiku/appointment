# Appointment Scheduling Domain

This context defines the business language for customer relationships and finite booking capacity across service businesses.

## Language

**Business**:
The tenant that owns services, customer relationships, providers, resources, and bookings. A solo or freelance provider operates as their own business.
_Avoid_: Tenant account, provider account

**Customer**:
A person known to one business who may make one or more bookings without having a login account.
_Avoid_: User, global customer, client account

**Customer Profile**:
The business-owned record representing a customer relationship and its durable identity, contact methods, preferences, and history.
_Avoid_: User profile, platform-wide identity

**Preferred Provider**:
A provider a customer prefers to book with; a customer may have multiple preferred providers.
_Avoid_: Primary provider, owning provider

**Offering**:
A bookable promise made by a business, including the service and the capacity requirements needed to fulfill it.
_Avoid_: Event type

**Resource**:
A non-person asset whose limited availability can constrain an offering, such as a room, vehicle, device, or piece of equipment.
_Avoid_: Provider, inventory item

**Resource Group**:
A set or pool of interchangeable resources that can satisfy the same capacity requirement.
_Avoid_: Appointment group, provider group

**Exclusive Capacity**:
A capacity mode in which one active allocation consumes the entire resource for its occupied interval.
_Avoid_: Single capacity

**Pooled Capacity**:
A capacity mode in which claims consume quantities from a shared inventory limit during overlapping intervals.
_Avoid_: Resource group

**Shared Scheduled Capacity**:
A capacity mode in which independent customer bookings claim units from one scheduled offering until its finite limit is reached.
_Avoid_: Group appointment, pooled resource

**Scheduled Offering**:
A dated occurrence of an offering with shared finite capacity that multiple customers can claim independently, such as a shuttle departure or class.
_Avoid_: Resource booking, group appointment

**Capacity Claim**:
The number of capacity units requested or held by one customer booking.
_Avoid_: Participant count, quantity sold

**Route Leg**:
The interval between two consecutive stops on a route; a passenger capacity claim occupies every route leg between that passenger's boarding and destination stops.
_Avoid_: Trip, duration

**Allocation**:
The provider, resource, resource-group units, or scheduled-offering capacity committed to a booking.
_Avoid_: Availability, capacity

**Resource-only Booking**:
A booking fulfilled entirely by resource capacity and therefore requiring no provider.
_Avoid_: Unstaffed appointment
