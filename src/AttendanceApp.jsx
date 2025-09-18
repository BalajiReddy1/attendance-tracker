import React, { useState, useEffect, useMemo } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, BarChart2 } from "lucide-react";
import { db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const TIMETABLE = {
	Monday: ["UIUE Lab", "JFSD", "DWM", "SDS", "UXDD"],
	Tuesday: ["DAL Lab", "JFSD", "Elective", "SDS", "WATL"],
	Wednesday: ["PPL Lab", "UXDD", "Elective", "SDS", "DWM"],
	Thursday: ["UXDD", "DWM", "WATL Lab", "JFSD", "ELECTIVE"],
	Friday: ["JFSD Lab", "SDS", "ELECTIVE", "-", "-"]
};
const ALL_SUBJECTS = Array.from(new Set(Object.values(TIMETABLE).flat().filter(s => s !== "-")));
const ATTENDANCE_OPTIONS = [
	{ label: "Present", value: "present" },
	{ label: "Absent", value: "absent" },
	{ label: "Cancelled", value: "cancelled" },
];

function getTodayISO() {
	return new Date().toISOString().slice(0, 10);
}

function getWeekday(dateStr) {
	// Fix: JS getDay() returns 0 for Sunday, 1 for Monday, ...
	// Our WEEKDAYS starts at Monday, so we need to map 1-5 to 0-4
	const d = new Date(dateStr);
	const jsDay = d.getDay(); // 0=Sunday, 1=Monday, ...
	// Map: 1=Monday->0, 2=Tuesday->1, ..., 5=Friday->4
	// If jsDay is 0 (Sunday) or 6 (Saturday), return undefined
	if (jsDay < 1 || jsDay > 5) return undefined;
	return WEEKDAYS[jsDay - 1];
}

export default function AttendanceApp({ user }) {
	const [attendance, setAttendance] = useState({});
	const [selectedDate, setSelectedDate] = useState(getTodayISO());

	// Load attendance from Firestore
	useEffect(() => {
		if (!user) return;
		const fetchData = async () => {
			const ref = doc(db, "users", user.uid);
			const snap = await getDoc(ref);
			if (snap.exists()) {
				const data = snap.data();
				setAttendance(data.attendance || {});
			}
		};
		fetchData();
	}, [user]);

	// Save attendance to Firestore
	useEffect(() => {
		if (!user) return;
		const ref = doc(db, "users", user.uid);
		setDoc(ref, { attendance }, { merge: true });
	}, [attendance, user]);

	function handleMarkAttendance(subject, status) {
		setAttendance(att => {
			const rec = att[selectedDate] || {};
			return {
				...att,
				[selectedDate]: { ...rec, [subject]: status },
			};
		});
	}

	function changeDate(offset) {
		const d = new Date(selectedDate);
		d.setDate(d.getDate() + offset);
		setSelectedDate(d.toISOString().slice(0, 10));
	}

	// Today's subjects
	const todayWeekday = getWeekday(selectedDate);
	const todaySubjects = todayWeekday ? TIMETABLE[todayWeekday] : [];

	// Attendance stats
	const attendanceStats = useMemo(() => {
		const stats = {};
		for (const subject of ALL_SUBJECTS) {
			let present = 0, total = 0;
			for (const rec of Object.values(attendance)) {
				if (rec[subject] === "present") present++;
				if (rec[subject] === "present" || rec[subject] === "absent") total++;
			}
			stats[subject] = { present, total, percent: total ? Math.round((present / total) * 100) : 0 };
		}
		return stats;
	}, [attendance]);

	function percentColor(p) {
		if (p >= 75) return "green";
		if (p >= 60) return "yellow";
		return "red";
	}

	return (
		<div className="attendance-bg">
			<style>{`
        .dashboard-container { display: flex; flex-wrap: wrap; gap: 2rem; max-width: 1100px; margin: 2rem auto; background: #fff; border-radius: 1.5rem; box-shadow: 0 4px 32px #0001; padding: 2rem 1.5rem; }
        .dashboard-left { flex: 1 1 350px; min-width: 280px; }
        .dashboard-right { flex: 1 1 350px; min-width: 280px; display: flex; flex-direction: column; gap: 2rem; }
        .dashboard-title { font-size: 2.2rem; font-weight: 800; color: #3730a3; display: flex; align-items: center; gap: 0.7rem; margin-bottom: 2rem; }
        .timetable-table { width: 100%; border-collapse: collapse; background: #f8fafc; border-radius: 1rem; overflow: hidden; margin-bottom: 2rem; }
        .timetable-table th, .timetable-table td { padding: 0.7rem 1rem; text-align: center; }
        .timetable-table th { background: #e0e7ff; color: #3730a3; font-weight: 700; }
        .timetable-table td { background: #f8fafc; color: #3730a3; font-weight: 500; font-size: 1rem; }
        .timetable-table td.empty { color: #a1a1aa; font-style: italic; }
        .attendance-marking { background: #f8fafc; border-radius: 1rem; box-shadow: 0 1px 4px #0001; padding: 1.2rem 1rem; margin-bottom: 1rem; }
        .attendance-marking-title { font-size: 1.3rem; font-weight: 700; color: #3730a3; margin-bottom: 1rem; display: flex; align-items: center; gap: 8px; }
        .attendance-marking-list { list-style: none; margin: 0; padding: 0; }
        .attendance-marking-list li { display: flex; align-items: center; justify-content: space-between; padding: 0.7rem 1rem; border-bottom: 1px solid #e0e7ff; }
        .attendance-marking-list li:last-child { border-bottom: none; }
        .attendance-btns button { margin-right: 0.5rem; border: none; border-radius: 0.5rem; padding: 0.5rem 1.1rem; font-weight: 600; font-size: 1rem; cursor: pointer; transition: background 0.2s, color 0.2s; background: #e0e7ff; color: #3730a3; }
        .attendance-btns button.selected { background: #22c55e; color: #fff; }
        .attendance-btns button.absent.selected { background: #ef4444; }
        .attendance-btns button.cancelled.selected { background: #a1a1aa; color: #fff; }
        .attendance-analytics { background: #f8fafc; border-radius: 1rem; box-shadow: 0 1px 4px #0001; padding: 1.2rem 1rem; }
        .attendance-analytics-title { font-size: 1.3rem; font-weight: 700; color: #3730a3; margin-bottom: 1rem; display: flex; align-items: center; gap: 8px; }
        .attendance-analytics-list { list-style: none; margin: 0; padding: 0; }
        .attendance-analytics-list li { display: flex; flex-direction: column; align-items: flex-start; padding: 0.7rem 1rem; border-bottom: 1px solid #e0e7ff; }
        .attendance-analytics-list li:last-child { border-bottom: none; }
        .attendance-progress-bar { width: 100%; height: 1.1rem; background: #e5e7eb; border-radius: 0.5rem; overflow: hidden; margin-top: 0.3rem; }
        .attendance-progress-inner.green { background: #22c55e; height: 100%; transition: width 0.5s; }
        .attendance-progress-inner.yellow { background: #facc15; height: 100%; transition: width 0.5s; }
        .attendance-progress-inner.red { background: #ef4444; height: 100%; transition: width 0.5s; }
        @media (max-width: 900px) {
          .dashboard-container { flex-direction: column; padding: 1.2rem 0.5rem; }
          .dashboard-left, .dashboard-right { min-width: 0; }
        }
      `}</style>
			<div className="dashboard-container">
				<div className="dashboard-left">
					<h1 className="dashboard-title">
						<BarChart2 style={{ color: '#6366f1', width: 36, height: 36 }} /> Attendance Dashboard
					</h1>
					<table className="timetable-table">
						<thead>
							<tr>
								<th>Day</th>
								<th>1</th>
								<th>2</th>
								<th>3</th>
								<th>4</th>
								<th>5</th>
							</tr>
						</thead>
						<tbody>
							{WEEKDAYS.map(day => (
								<tr key={day}>
									<td>{day}</td>
									{TIMETABLE[day].map((subject, idx) => (
										<td key={idx} className={subject === "-" ? "empty" : ""}>{subject === "-" ? "–" : subject}</td>
									))}
								</tr>
							))}
						</tbody>
					</table>
				</div>
				<div className="dashboard-right">
					<div className="attendance-marking">
						<div className="attendance-marking-title">
							<CalendarDays style={{ width: 20, height: 20, color: '#6366f1' }} /> Mark Attendance ({todayWeekday})
						</div>
						<div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
							<button
								className="attendance-btn"
								style={{ padding: '0.7rem 1rem' }}
								onClick={() => changeDate(-1)}
								aria-label="Previous Day"
							>
								<ChevronLeft style={{ width: 20, height: 20 }} />
							</button>
							<input
								type="date"
								className="attendance-input"
								style={{ maxWidth: 180 }}
								value={selectedDate}
								onChange={e => setSelectedDate(e.target.value)}
								max={getTodayISO()}
							/>
							<button
								className="attendance-btn"
								style={{ padding: '0.7rem 1rem' }}
								onClick={() => changeDate(1)}
								aria-label="Next Day"
							>
								<ChevronRight style={{ width: 20, height: 20 }} />
							</button>
						</div>
						<ul className="attendance-marking-list">
							{todaySubjects.map(subject => (
								subject === "-" ? (
									<li key={subject + Math.random()} style={{ color: '#a1a1aa', fontStyle: 'italic' }}>–</li>
								) : (
									<li key={subject}>
										<span style={{ fontWeight: 600, color: '#3730a3', fontSize: 18 }}>{subject}</span>
										<div className="attendance-btns">
											{ATTENDANCE_OPTIONS.map(opt => (
												<button
													key={opt.value}
													className={
														(attendance[selectedDate]?.[subject] === opt.value ? 'selected ' : '') +
														(opt.value === 'absent' && attendance[selectedDate]?.[subject] === opt.value ? 'absent ' : '') +
														(opt.value === 'cancelled' && attendance[selectedDate]?.[subject] === opt.value ? 'cancelled ' : '')
													}
													onClick={() => handleMarkAttendance(subject, opt.value)}
												>
													{opt.label}
												</button>
											))}
										</div>
									</li>
								)
							))}
						</ul>
					</div>
					<div className="attendance-analytics">
						<div className="attendance-analytics-title">
							<BarChart2 style={{ width: 20, height: 20, color: '#6366f1' }} /> Attendance Analytics
						</div>
						<ul className="attendance-analytics-list">
							{ALL_SUBJECTS.map(subject => {
								const { present, total, percent } = attendanceStats[subject];
								const color = percentColor(percent);
								return (
									<li key={subject}>
										<div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
											<span style={{ fontWeight: 600, color: '#3730a3', fontSize: 18 }}>{subject}</span>
											<span style={{ fontSize: 15, color: '#6b7280', fontFamily: 'monospace' }}>
												{present} / {total} attended
												{total > 0 && (
													<span style={{ marginLeft: 10, fontWeight: 700 }}>{percent}%</span>
												)}
											</span>
										</div>
										<div className="attendance-progress-bar">
											<div className={`attendance-progress-inner ${color}`} style={{ width: `${percent}%` }}></div>
										</div>
									</li>
								);
							})}
						</ul>
					</div>
				</div>
			</div>
			<footer className="attendance-footer" style={{ marginTop: 32 }}>
				&copy; {new Date().getFullYear()} Attendance Tracker. Made with React and lucide-react.
			</footer>
		</div>
	);
}
