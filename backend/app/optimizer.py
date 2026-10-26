from ortools.sat.python import cp_model


def allocate_jobs(jobs: list[dict], vehicles: list[dict]) -> dict:
    """
    Assign each job to exactly one vehicle when feasible.
    Enforces payload capacity per vehicle.

    Each job:
      {"id": "JOB-1", "weight_kg": 350}

    Each vehicle:
      {"id": "MH-01", "capacity_kg": 1500}
    """
    if not vehicles:
        return {
            "status": "infeasible",
            "assignments": [],
            "unassigned_jobs": [job["id"] for job in jobs],
            "message": "No vehicles provided.",
        }

    for job in jobs:
        if job["weight_kg"] < 0:
            raise ValueError(f"Negative weight for job {job['id']}.")

    for vehicle in vehicles:
        if vehicle["capacity_kg"] < 0:
            raise ValueError(f"Negative capacity for vehicle {vehicle['id']}.")

    model = cp_model.CpModel()

    # x[j, v] = 1 when job j is assigned to vehicle v.
    x = {
        (j, v): model.new_bool_var(f"job_{j}_vehicle_{v}")
        for j in range(len(jobs))
        for v in range(len(vehicles))
    }

    # A job can be assigned to at most one vehicle.
    for j in range(len(jobs)):
        model.add(
            sum(x[j, v] for v in range(len(vehicles))) <= 1
        )

    # Total assigned weight must fit the vehicle payload.
    for v, vehicle in enumerate(vehicles):
        model.add(
            sum(
                jobs[j]["weight_kg"] * x[j, v]
                for j in range(len(jobs))
            ) <= vehicle["capacity_kg"]
        )

    # Maximize the number of assigned jobs.
    # Among equal job counts, prefer lower total assigned weight
    # only as a simple tie-breaker, not as a business objective.
    model.maximize(
        sum(
            x[j, v] * (100_000 - jobs[j]["weight_kg"])
            for j in range(len(jobs))
            for v in range(len(vehicles))
        )
    )

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 5.0
    status = solver.solve(model)

    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return {
            "status": "no_solution",
            "assignments": [],
            "unassigned_jobs": [job["id"] for job in jobs],
            "message": "No feasible allocation was found.",
        }

    assignments = []
    assigned_ids = set()

    for j, job in enumerate(jobs):
        for v, vehicle in enumerate(vehicles):
            if solver.value(x[j, v]):
                assignments.append({
                    "job_id": job["id"],
                    "vehicle_id": vehicle["id"],
                    "weight_kg": job["weight_kg"],
                })
                assigned_ids.add(job["id"])
                break

    return {
        "status": "optimal" if status == cp_model.OPTIMAL else "feasible",
        "assignments": assignments,
        "unassigned_jobs": [
            job["id"] for job in jobs if job["id"] not in assigned_ids
        ],
        "message": "Capacity-constrained allocation completed.",
    }