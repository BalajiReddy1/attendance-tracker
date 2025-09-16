import React, { useState, useEffect, useMemo } from "react";
import { CalendarDays, Plus, Trash2, ChevronLeft, ChevronRight, BarChart2 } from "lucide-react";

// Minimal modern CSS for the app
const style = `
.attendance-bg { background: linear-gradient(135deg, #e0e7ff 0%, #f0f4ff 100%); min-height: 100vh; }
.attendance-container { max-width: 700px; margin: 2rem auto; background: #fff; border-radius: 1.5rem; box-shadow: 0 4px 32px #0001; padding: 2rem 1.5rem; }
.attendance-title { font-size: 2.2rem; font-weight: 800; color: #3730a3; display: flex; align-items: center; gap: 0.7rem; margin-bottom: 1.5rem; }
.attendance-section { margin-bottom: 2.5rem; }
.attendance-section h2 { font-size: 1.3rem; font-weight: 700; color: #3730a3; margin-bottom: 0.7rem; }
.attendance-input-row { display: flex; flex-wrap: wrap; gap: 0.7rem; margin-bottom: 1rem; align-items: center; }
.attendance-input { flex: 1; padding: 0.7rem 1rem; border-radius: 0.7rem; border: 1px solid #c7d2fe; font-size: 1rem; }
.attendance-btn { display: flex; align-items: center; gap: 0.4rem; background: linear-gradient(90deg, #6366f1, #60a5fa); color: #fff; border: none; border-radius: 0.7rem; padding: 0.7rem 1.5rem; font-weight: 600; font-size: 1rem; cursor: pointer; box-shadow: 0 2px 8px #0001; transition: background 0.2s; }
.attendance-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.attendance-btn:hover:not(:disabled) { background: linear-gradient(90deg, #4f46e5, #2563eb); }
.attendance-day-select label { margin-right: 0.5rem; font-size: 0.95rem; cursor: pointer; padding: 0.2rem 0.7rem; border-radius: 0.5rem; background: #eef2ff; color: #3730a3; }
.attendance-day-select input:checked + span { background: #6366f1; color: #fff; }
.attendance-list { list-style: none; margin: 0; padding: 0; border-radius: 1rem; background: #f8fafc; box-shadow: 0 1px 4px #0001; }
.attendance-list li { display: flex; align-items: center; justify-content: space-between; padding: 0.7rem 1rem; border-bottom: 1px solid #e0e7ff; }
.attendance-list li:last-child { border-bottom: none; }
.attendance-list .attendance-delete { background: none; border: none; color: #ef4444; cursor: pointer; border-radius: 50%; padding: 0.3rem; transition: background 0.2s; }
.attendance-list .attendance-delete:hover { background: #fee2e2; }
.attendance-timetable-table { width: 100%; border-collapse: collapse; background: #f8fafc; border-radius: 1rem; overflow: hidden; }
.attendance-timetable-table th, .attendance-timetable-table td { padding: 0.7rem 1rem; text-align: left; }
.attendance-timetable-table th { background: #e0e7ff; color: #3730a3; font-weight: 700; }
.attendance-timetable-table tr { border-bottom: 1px solid #e0e7ff; }
.attendance-timetable-table tr:last-child { border-bottom: none; }
.attendance-timetable-badge { display: inline-block; background: #6366f1; color: #fff; border-radius: 0.5rem; padding: 0.2rem 0.8rem; font-size: 0.97rem; margin-right: 0.3rem; }
.attendance-holiday { color: #a1a1aa; font-style: italic; }
.attendance-attendance-btns button { margin-right: 0.5rem; border: none; border-radius: 0.5rem; padding: 0.5rem 1.1rem; font-weight: 600; font-size: 1rem; cursor: pointer; transition: background 0.2s, color 0.2s; background: #e0e7ff; color: #3730a3; }
.attendance-attendance-btns button.selected { background: #22c55e; color: #fff; }
.attendance-attendance-btns button.absent.selected { background: #ef4444; }
.attendance-attendance-btns button.cancelled.selected { background: #a1a1aa; color: #fff; }
.attendance-progress-bar { width: 100%; height: 1.1rem; background: #e5e7eb; border-radius: 0.5rem; overflow: hidden; margin-top: 0.3rem; }
.attendance-progress-inner { height: 100%; transition: width 0.5s; }
.attendance-progress-inner.green { background: #22c55e; }
.attendance-progress-inner.yellow { background: #facc15; }
.attendance-progress-inner.red { background: #ef4444; }
.attendance-footer { text-align: center; color: #a1a1aa; font-size: 0.9rem; margin-top: 2rem; }
`;

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const ATTENDANCE_OPTIONS = [
	{ label: "Present", value: "present", color: "bg-green-500" },
	{ label: "Absent", value: "absent", color: "bg-red-500" },
	{ label: "Cancelled", value: "cancelled", color: "bg-gray-400" },
];

function getTodayISO() {
	return new Date().toISOString().slice(0, 10);
}

function getWeekday(dateStr) {
	return WEEKDAYS[new Date(dateStr).getDay() === 0 ? 6 : new Date(dateStr).getDay() - 1];
}

function load(key, fallback) {
	try {
		const data = localStorage.getItem(key);
		return data ? JSON.parse(data) : fallback;
	} catch {
		return fallback;
	}
}

function save(key, value) {
	localStorage.setItem(key, JSON.stringify(value));
}


export default function AttendanceApp() {
	// Subjects: [{ name: string, days: [string] }]
	const [subjects, setSubjects] = useState(() => {
		// Migrate old data: if any subject is missing 'days', default to all weekdays (Mon-Fri)
		const loaded = load("subjects", []);
		return loaded.map(subj =>
			subj && Array.isArray(subj.days)
				? subj
				: { name: subj.name || String(subj), days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] }
		);
	});
	const [newSubject, setNewSubject] = useState("");
	const [subjectDays, setSubjectDays] = useState([]);

	// Timetable: { Monday: [subject1, subject2], ... } (derived)
	const timetable = useMemo(() => {
		const tt = Object.fromEntries(WEEKDAYS.map(d => [d, []]));
		for (const subj of subjects) {
			for (const day of subj.days) {
				tt[day].push(subj.name);
			}
		}
		return tt;
	}, [subjects]);

	// Attendance: { "2025-09-14": { subject: "present" } }
	const [attendance, setAttendance] = useState(() => load("attendance", {}));

	// Date navigation
	const [selectedDate, setSelectedDate] = useState(getTodayISO());

	// Save to localStorage on change
	useEffect(() => { save("subjects", subjects); }, [subjects]);
	useEffect(() => { save("attendance", attendance); }, [attendance]);

	function handleAddSubject() {
		const name = newSubject.trim();
		if (!name || subjects.some(s => s.name === name) || subjectDays.length === 0) return;
		setSubjects([...subjects, { name, days: subjectDays }]);
		setNewSubject("");
		setSubjectDays([]);
	}

	function handleDeleteSubject(name) {
		setSubjects(subjects.filter(s => s.name !== name));
		// Remove from attendance
		const newAttendance = {};
		for (const [date, rec] of Object.entries(attendance)) {
			const filtered = Object.fromEntries(Object.entries(rec).filter(([sub]) => sub !== name));
			if (Object.keys(filtered).length) newAttendance[date] = filtered;
		}
		setAttendance(newAttendance);
	}

	// Attendance marking
	function handleMarkAttendance(subject, status) {
		setAttendance(att => {
			const rec = att[selectedDate] || {};
			return {
				...att,
				[selectedDate]: { ...rec, [subject]: status },
			};
		});
	}

	// Date navigation
	function changeDate(offset) {
		const d = new Date(selectedDate);
		d.setDate(d.getDate() + offset);
		setSelectedDate(d.toISOString().slice(0, 10));
	}

	// Subjects scheduled for selected date
	const scheduledSubjects = useMemo(() => {
		const day = getWeekday(selectedDate);
		return timetable[day] || [];
	}, [selectedDate, timetable]);

	// Attendance stats
	const attendanceStats = useMemo(() => {
		const stats = {};
		for (const subject of subjects) {
			let present = 0, total = 0;
			for (const rec of Object.values(attendance)) {
				if (rec[subject.name] === "present") present++;
				if (rec[subject.name] === "present" || rec[subject.name] === "absent") total++;
			}
			stats[subject.name] = { present, total, percent: total ? Math.round((present / total) * 100) : 0 };
		}
		return stats;
	}, [subjects, attendance]);

	function percentColor(p) {
		if (p >= 75) return "bg-green-500";
		if (p >= 60) return "bg-yellow-400";
		return "bg-red-500";
	}

		return (
			<div className="attendance-bg">
				<style>{style}</style>
				<div className="attendance-container">
					<h1 className="attendance-title">
						<BarChart2 style={{ color: '#6366f1', width: 36, height: 36 }} /> Attendance Tracker
					</h1>
					{/* Subject Management */}
					<section className="attendance-section">
						<h2>Subject Management</h2>
						<div className="attendance-input-row">
							<input
								className="attendance-input"
								placeholder="Add new subject..."
								value={newSubject}
								onChange={e => setNewSubject(e.target.value)}
								maxLength={32}
							/>
							<div className="attendance-day-select">
								{WEEKDAYS.slice(0,5).map(day => (
									<label key={day}>
										<input
											type="checkbox"
											style={{ display: 'none' }}
											checked={subjectDays.includes(day)}
											onChange={() => setSubjectDays(sd => sd.includes(day) ? sd.filter(d => d !== day) : [...sd, day])}
										/>
										<span style={{ background: subjectDays.includes(day) ? '#6366f1' : '#eef2ff', color: subjectDays.includes(day) ? '#fff' : '#3730a3', padding: '0.2rem 0.7rem', borderRadius: '0.5rem', marginRight: 4 }}>{day.slice(0,3)}</span>
									</label>
								))}
							</div>
							<button
								className="attendance-btn"
								onClick={handleAddSubject}
								aria-label="Add Subject"
								disabled={!newSubject.trim() || subjectDays.length === 0}
							>
								<Plus style={{ width: 20, height: 20 }} /> Add
							</button>
						</div>
						{subjects.length === 0 ? (
							<div style={{ color: '#a1a1aa', fontStyle: 'italic', fontSize: 16 }}>No subjects yet. Add your first subject above!</div>
						) : (
							<ul className="attendance-list">
								{subjects.map(subject => (
									<li key={subject.name}>
										<span style={{ fontWeight: 600, color: '#3730a3', fontSize: 18 }}>{subject.name}
											<span style={{ marginLeft: 8, fontSize: 13, color: '#6366f1', fontWeight: 400 }}>
												[
												{subject.days.map(d => d.slice(0,3)).join(', ')}
												]
											</span>
										</span>
										<button
											className="attendance-delete"
											onClick={() => handleDeleteSubject(subject.name)}
											aria-label={`Delete ${subject.name}`}
										>
											<Trash2 style={{ width: 20, height: 20 }} />
										</button>
									</li>
								))}
							</ul>
						)}
					</section>

					{/* Timetable */}
					<section className="attendance-section">
						<h2>Weekly Timetable</h2>
						<div style={{ overflowX: 'auto' }}>
							<table className="attendance-timetable-table">
								<thead>
									<tr>
										<th>Day</th>
										<th>Subjects</th>
									</tr>
								</thead>
								<tbody>
									{WEEKDAYS.map(day => (
										<tr key={day}>
											<td>{day}</td>
											<td>
												{day === "Saturday" || day === "Sunday" ? (
													<span className="attendance-holiday">Holiday</span>
												) : (
													timetable[day].length === 0 ? (
														<span style={{ color: '#a1a1aa' }}>No subjects</span>
													) : (
														timetable[day].map(subject => (
															<span key={subject} className="attendance-timetable-badge">{subject}</span>
														))
													)
												)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</section>

					{/* Daily Attendance */}
					<section className="attendance-section">
						<h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><CalendarDays style={{ width: 20, height: 20, color: '#6366f1' }} /> Daily Attendance</h2>
						<div className="attendance-input-row" style={{ marginBottom: 18 }}>
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
							<span style={{ marginLeft: 12, color: '#6b7280', fontWeight: 500 }}>{getWeekday(selectedDate)}</span>
						</div>
						{scheduledSubjects.length === 0 ? (
							<div style={{ color: '#a1a1aa', fontStyle: 'italic', fontSize: 16 }}>No subjects scheduled for this day.</div>
						) : (
							<ul className="attendance-list">
								{scheduledSubjects.map(subject => (
									<li key={subject}>
										<span style={{ fontWeight: 600, color: '#3730a3', fontSize: 18 }}>{subject}</span>
										<div className="attendance-attendance-btns">
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
								))}
							</ul>
						)}
					</section>

					{/* Attendance Analytics */}
					<section className="attendance-section">
						<h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><BarChart2 style={{ width: 20, height: 20, color: '#6366f1' }} /> Attendance Analytics</h2>
						{subjects.length === 0 ? (
							<div style={{ color: '#a1a1aa', fontStyle: 'italic', fontSize: 16 }}>No subjects to analyze.</div>
						) : (
							<ul className="attendance-list">
								{subjects.map(subject => {
									const { present, total, percent } = attendanceStats[subject.name];
									let color = 'green';
									if (percent < 60) color = 'red';
									else if (percent < 75) color = 'yellow';
									return (
										<li key={subject.name} style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
											<div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
												<span style={{ fontWeight: 600, color: '#3730a3', fontSize: 18 }}>{subject.name}</span>
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
						)}
					</section>
				</div>
				<footer className="attendance-footer">
					&copy; {new Date().getFullYear()} Attendance Tracker. Made with React and lucide-react.
				</footer>
			</div>
		);
	}
