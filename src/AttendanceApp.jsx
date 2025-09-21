import React, { useState, useEffect, useMemo } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, BarChart2 } from "lucide-react";
import { db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const DEFAULT_TIMETABLE = {
	Monday: ["UIUE Lab", "JFSD", "DWM", "SDS", "UXDD"],
	Tuesday: ["DAL Lab", "JFSD", "ELECTIVE", "SDS", "WATL"],
	Wednesday: ["PPL Lab", "UXDD", "ELECTIVE", "SDS", "DWM"],
	Thursday: ["UXDD", "DWM", "WATL Lab", "JFSD", "ELECTIVE"],
	Friday: ["JFSD Lab", "SDS", "ELECTIVE", "-", "-"]
};
function getAllSubjects(timetable) {
	return Array.from(new Set(Object.values(timetable).flat().filter(s => s !== "-")));
}
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
	const [timetable, setTimetable] = useState(DEFAULT_TIMETABLE);
	const [loaded, setLoaded] = useState(false);

	// Load attendance and timetable from Firestore
	useEffect(() => {
		if (!user) return;
		const fetchData = async () => {
			const ref = doc(db, "users", user.uid);
			const snap = await getDoc(ref);
			if (snap.exists()) {
				const data = snap.data();
				console.log("[Firestore] Loaded data:", data);
				setAttendance(data.attendance || {});
				setTimetable(data.timetable || DEFAULT_TIMETABLE);
			} else {
				console.log("[Firestore] No user document found for", user.uid);
			}
			setLoaded(true);
		};
		fetchData();
	}, [user]);

	// Save attendance and timetable to Firestore together
	useEffect(() => {
		if (!user || !loaded) return;
		const ref = doc(db, "users", user.uid);
		console.log("[Firestore] Saving data:", { attendance, timetable });
		setDoc(ref, { attendance, timetable }, { merge: true })
			.then(() => {
				console.log("[Firestore] Save successful");
			})
			.catch((err) => {
				console.error("Error saving attendance/timetable to Firestore:", err);
			});
	}, [attendance, timetable, user, loaded]);

	function handleMarkAttendance(subject, status) {
		setAttendance(att => {
			const rec = att[selectedDate] || {};
			return {
				...att,
				[selectedDate]: { ...rec, [subject]: status },
			};
		});
	}

	// Proxy lecture logic
	function handleAddProxy(subject) {
		const replacement = prompt("Enter replacement subject/teacher for proxy:");
		if (!replacement) return;
		setAttendance(att => {
			const rec = att[selectedDate] || {};
			const proxies = rec.proxies || [];
			return {
				...att,
				[selectedDate]: {
					...rec,
					proxies: [...proxies, { scheduled: subject, replacement, status: "present" }],
				},
			};
		});
	}

	function handleProxyStatus(idx, status) {
		setAttendance(att => {
			const rec = att[selectedDate] || {};
			const proxies = (rec.proxies || []).slice();
			proxies[idx].status = status;
			return {
				...att,
				[selectedDate]: {
					...rec,
					proxies,
				},
			};
		});
	}

	// Extra lecture logic
	function handleAddExtraLecture() {
		const subject = prompt("Enter extra lecture subject:");
		if (!subject) return;
		const teacher = prompt("Enter teacher for extra lecture (optional):");
		setAttendance(att => {
			const rec = att[selectedDate] || {};
			const extras = rec.extras || [];
			return {
				...att,
				[selectedDate]: {
					...rec,
					extras: [...extras, { subject, teacher, status: "present" }],
				},
			};
		});
	}

	function handleExtraStatus(idx, status) {
		setAttendance(att => {
			const rec = att[selectedDate] || {};
			const extras = (rec.extras || []).slice();
			extras[idx].status = status;
			return {
				...att,
				[selectedDate]: {
					...rec,
					extras,
				},
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
	const todaySubjects = todayWeekday ? timetable[todayWeekday] : [];

	// Attendance stats
	const ALL_SUBJECTS = useMemo(() => getAllSubjects(timetable), [timetable]);
	const attendanceStats = useMemo(() => {
		const stats = {};
		for (const subject of ALL_SUBJECTS) {
			let present = 0, total = 0;
			for (const rec of Object.values(attendance)) {
				// Regular scheduled lectures
				if (rec[subject] === "present") present++;
				if (rec[subject] === "present" || rec[subject] === "absent") total++;
				// Proxy lectures
				if (Array.isArray(rec.proxies)) {
					for (const proxy of rec.proxies) {
						if (proxy.replacement === subject) {
							if (proxy.status === "present") present++;
							if (proxy.status === "present" || proxy.status === "absent") total++;
						}
					}
				}
				// Extra lectures
				if (Array.isArray(rec.extras)) {
					for (const extra of rec.extras) {
						if (extra.subject === subject) {
							if (extra.status === "present") present++;
							if (extra.status === "present" || extra.status === "absent") total++;
						}
					}
				}
			}
			stats[subject] = { present, total, percent: total ? Math.round((present / total) * 100) : 0 };
		}
		return stats;
	}, [attendance, ALL_SUBJECTS]);

	function percentColor(p) {
		if (p >= 75) return "green";
		if (p >= 60) return "yellow";
		return "red";
	}

	return (
				<div className="attendance-bg">
						<style>{`
							body, .attendance-bg {
								background: linear-gradient(135deg, #6366f1 0%, #a5b4fc 100%);
								min-height: 100vh;
							}
											.dashboard-container {
												display: flex;
												flex-wrap: wrap;
												gap: 2.5rem;
												max-width: 1200px;
												margin: 2.5rem auto;
												background: rgba(255,255,255,0.97);
												border-radius: 2rem;
												box-shadow: 0 8px 40px #6366f133;
												padding: 2.5rem 2rem;
												backdrop-filter: blur(2px);
												animation: fadeIn 0.7s;
											}
															@media (max-width: 900px) {
																.dashboard-container {
																	flex-direction: column;
																	padding: 1rem 0.2rem;
																	gap: 1rem;
																}
																.dashboard-left, .dashboard-right {
																	min-width: 0;
																	width: 100%;
																}
																.dashboard-title {
																	font-size: 1.3rem;
																	margin-bottom: 1rem;
																	word-break: break-word;
																}
																.attendance-marking, .attendance-analytics {
																	padding: 0.7rem 0.2rem;
																}
																				.timetable-table {
																					display: block;
																					width: 100%;
																					overflow-x: auto;
																					font-size: 0.95rem;
																					border-radius: 0.7rem;
																					box-shadow: none;
																					background: #f8fafc;
																				}
																				.timetable-table thead, .timetable-table tbody, .timetable-table tr {
																					display: table;
																					width: 100%;
																					table-layout: fixed;
																				}
																				.timetable-table th, .timetable-table td {
																					padding: 0.12rem 0.04rem;
																					font-size: 0.2rem;
																					word-break: normal;
																					white-space: nowrap;
																					overflow: hidden;
																					text-overflow: clip;
																					max-width: 40px;
																				}
																				.timetable-table th {
																					font-weight: 700;
																					background: #e0e7ff;
																				}
																.attendance-marking-list li, .attendance-analytics-list li {
																	flex-direction: column;
																	align-items: flex-start;
																	padding: 0.7rem 0.2rem;
																}
																.attendance-btns {
																	flex-wrap: wrap;
																	gap: 0.12rem;
																}
																.attendance-btns button {
																	margin-bottom: 0.3rem;
																	min-width: 80px;
																	font-size: 0.95rem;
																	padding: 0.5rem 0.7rem;
																}
															}
							@keyframes fadeIn {
								from { opacity: 0; transform: translateY(30px); }
								to { opacity: 1; transform: none; }
							}
							.dashboard-left {
								flex: 1 1 350px;
								min-width: 280px;
								margin-right: 1rem;
							}
							.dashboard-right {
								flex: 1 1 350px;
								min-width: 280px;
								display: flex;
								flex-direction: column;
								gap: 2.5rem;
							}
							.dashboard-title {
								font-size: 2.5rem;
								font-weight: 900;
								color: #4338ca;
								display: flex;
								align-items: center;
								gap: 1rem;
								margin-bottom: 2.5rem;
								letter-spacing: -1px;
								text-shadow: 0 2px 8px #6366f122;
							}
							.timetable-table {
								width: 100%;
								border-collapse: collapse;
								background: #f3f4f6;
								border-radius: 1.2rem;
								overflow: hidden;
								margin-bottom: 2.5rem;
								box-shadow: 0 2px 12px #6366f111;
							}
							.timetable-table th, .timetable-table td {
								padding: 1rem 1.2rem;
								text-align: center;
								font-size: 1.1rem;
							}
							.timetable-table th {
								background: #e0e7ff;
								color: #4338ca;
								font-weight: 800;
								letter-spacing: 0.5px;
							}
							.timetable-table td {
								background: #f3f4f6;
								color: #4338ca;
								font-weight: 600;
							}
							.timetable-table td.empty {
								color: #a1a1aa;
								font-style: italic;
							}
							.attendance-marking {
								background: #f3f4f6;
								border-radius: 1.2rem;
								box-shadow: 0 2px 12px #6366f111;
								padding: 1.5rem 1.2rem;
								margin-bottom: 1.2rem;
								animation: fadeIn 0.7s;
							}
							.attendance-marking-title {
								font-size: 1.5rem;
								font-weight: 800;
								color: #4338ca;
								margin-bottom: 1.2rem;
								display: flex;
								align-items: center;
								gap: 10px;
							}
							.attendance-marking-list {
								list-style: none;
								margin: 0;
								padding: 0;
							}
							.attendance-marking-list li {
								display: flex;
								align-items: center;
								justify-content: space-between;
								padding: 1rem 1.2rem;
								border-bottom: 1px solid #e0e7ff;
								transition: background 0.2s;
							}
							.attendance-marking-list li:hover {
								background: #e0e7ff33;
							}
							.attendance-marking-list li:last-child {
								border-bottom: none;
							}
							.attendance-btns button {
								margin-right: 0.5rem;
								border: none;
								border-radius: 0.7rem;
								padding: 0.6rem 1.2rem;
								font-weight: 700;
								font-size: 1.05rem;
								cursor: pointer;
								transition: background 0.2s, color 0.2s, transform 0.1s;
								background: #e0e7ff;
								color: #4338ca;
								box-shadow: 0 1px 4px #6366f111;
							}
							.attendance-btns button:hover {
								transform: scale(1.07);
								background: #6366f1;
								color: #fff;
							}
							.attendance-btns button.selected {
								background: #22c55e;
								color: #fff;
								box-shadow: 0 2px 8px #22c55e33;
							}
							.attendance-btns button.absent.selected {
								background: #ef4444;
							}
							.attendance-btns button.cancelled.selected {
								background: #a1a1aa;
								color: #fff;
							}
							.attendance-analytics {
								background: #f3f4f6;
								border-radius: 1.2rem;
								box-shadow: 0 2px 12px #6366f111;
								padding: 1.5rem 1.2rem;
								animation: fadeIn 0.7s;
							}
							.attendance-analytics-title {
								font-size: 1.5rem;
								font-weight: 800;
								color: #4338ca;
								margin-bottom: 1.2rem;
								display: flex;
								align-items: center;
								gap: 10px;
							}
							.attendance-analytics-list {
								list-style: none;
								margin: 0;
								padding: 0;
							}
							.attendance-analytics-list li {
								display: flex;
								flex-direction: column;
								align-items: flex-start;
								padding: 1rem 1.2rem;
								border-bottom: 1px solid #e0e7ff;
								transition: background 0.2s;
							}
							.attendance-analytics-list li:hover {
								background: #e0e7ff33;
							}
							.attendance-analytics-list li:last-child {
								border-bottom: none;
							}
							.attendance-progress-bar {
								width: 100%;
								height: 1.2rem;
								background: #e5e7eb;
								border-radius: 0.7rem;
								overflow: hidden;
								margin-top: 0.4rem;
								box-shadow: 0 1px 4px #6366f111;
							}
											.attendance-progress-inner.green {
												background: #22c55e;
												height: 100%;
												border-radius: 0.7rem;
												transition: width 0.5s;
											}
											.attendance-progress-inner.yellow {
												background: #facc15;
												height: 100%;
												border-radius: 0.7rem;
												transition: width 0.5s;
											}
											.attendance-progress-inner.red {
												background: #ef4444;
												height: 100%;
												border-radius: 0.7rem;
												transition: width 0.5s;
											}
							@media (max-width: 900px) {
								.dashboard-container {
									flex-direction: column;
									padding: 1.5rem 0.7rem;
								}
								.dashboard-left, .dashboard-right {
									min-width: 0;
								}
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
													{timetable[day]?.map((subject, idx) => (
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
											<button style={{ marginLeft: 8, background: '#facc15', color: '#3730a3', fontWeight: 600 }} onClick={() => handleAddProxy(subject)}>Proxy</button>
										</div>
									</li>
								)
							))}
							{/* Proxy lectures */}
							{(attendance[selectedDate]?.proxies || []).map((proxy, idx) => (
								<li key={"proxy-" + idx}>
									<span style={{ fontWeight: 600, color: '#ef4444', fontSize: 16 }}>Proxy for {proxy.scheduled}:</span>
									<span style={{ fontWeight: 600, color: '#3730a3', fontSize: 16 }}>{proxy.replacement}</span>
									<div className="attendance-btns">
										{ATTENDANCE_OPTIONS.map(opt => (
											<button
												key={opt.value}
												className={proxy.status === opt.value ? 'selected' : ''}
												onClick={() => handleProxyStatus(idx, opt.value)}
											>
												{opt.label}
											</button>
										))}
									</div>
								</li>
							))}
							{/* Extra lectures */}
							{(attendance[selectedDate]?.extras || []).map((extra, idx) => (
								<li key={"extra-" + idx}>
									<span style={{ fontWeight: 600, color: '#22c55e', fontSize: 16 }}>Extra:</span>
									<span style={{ fontWeight: 600, color: '#3730a3', fontSize: 16 }}>{extra.subject}</span>
									{extra.teacher && <span style={{ fontWeight: 500, color: '#6366f1', fontSize: 15, marginLeft: 8 }}>({extra.teacher})</span>}
									<div className="attendance-btns">
										{ATTENDANCE_OPTIONS.map(opt => (
											<button
												key={opt.value}
												className={extra.status === opt.value ? 'selected' : ''}
												onClick={() => handleExtraStatus(idx, opt.value)}
											>
												{opt.label}
											</button>
										))}
									</div>
								</li>
							))}
						</ul>
						<button style={{ marginTop: 12, background: '#22c55e', color: '#fff', fontWeight: 600, borderRadius: 8, padding: '0.7rem 1.2rem', fontSize: 16 }} onClick={handleAddExtraLecture}>Add Extra Lecture</button>
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
