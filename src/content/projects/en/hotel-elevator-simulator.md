---
title: Hotel Elevator Simulator
summary: A discrete-event simulator that reproduces hotel traffic and compares elevator group control methods.
overview: A discrete-event simulator that reproduces hotel travel demand by time of day and floor, for comparing several elevator group control methods.
format: Simulator
team: Personal project
status: Prototype
period: "2026"
stack:
  - Python
  - SimPy
links:
  - label: GitHub
    href: https://github.com/naga-T28/Hotel-Predictive-Elevator-Simulator
art: shafts
order: 7
featured: false
published: false
---

## Problem

Elevator demand in a hotel changes greatly with the time of day and with events such as checkout, breakfast and the end of banquets.

## Goal

To run several control methods on the same passenger arrivals and compare the differences in car assignment and demand forecasting.

## Design and implementation

### Demand specific to hotels

On top of Poisson-arrival base traffic, it handles checkout, breakfast, banquet endings, and capacity used by groups and luggage.

### Predictive assignment and parking control

I implemented assignment using future demand, parking control for idle cars and demand forecasting from walking paths.

### Comparable evaluation

Experiments repeat over several random seeds, and metrics such as waiting time and empty travel distance are output as CSV, JSON and graphs.

## Results

- Published on GitHub as a prototype for simulation.

> It is not intended for connecting to real elevator controllers or for implementing safety control.
