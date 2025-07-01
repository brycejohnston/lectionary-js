import * as React from "react";
import { DateTime } from "luxon";
import { Link } from "wouter";

import { CalendarBuilder } from "../lib/CalendarBuilder";
import { KeyLoader } from "../lib/KeyLoader";
import { findColor, findProperByType, hasReadings } from "../lib/utils";

import lectionary from "../data/lsb-1yr.json";
import festivals from "../data/lsb-festivals.json";
import daily from "../data/lsb-daily.json";
import commemorations from "../data/lsb-commemorations.json";

const loader = new KeyLoader({ lectionary, festivals, daily, commemorations });

/**
 * @typedef {object} Props
 * @prop {number} year
 * @prop {number} month
 * @extends {Component<Props>}
 */
export default class Calendar extends React.Component {
  componentDidMount() {
    this.build();
  }

  getYearAndMonthLabel({ year, month }) {
    return DateTime.fromObject({ year, month, day: 1 }).toFormat("MMMM y");
  }

  getYearAndMonth() {
    return {
      year: parseInt(this.props.year),
      month: parseInt(this.props.month),
    };
  }

  getNextMonth() {
    const { year, month } = this.getYearAndMonth();

    if (month === 12) {
      return { year: year + 1, month: "01" };
    } else {
      return { year, month: this.padNumber(month + 1) };
    }
  }

  getLastMonth() {
    const { year, month } = this.getYearAndMonth();

    if (month === 1) {
      return { year: year - 1, month: 12 };
    } else {
      return { year, month: this.padNumber(month - 1) };
    }
  }

  padNumber(v) {
    if (v < 10) {
      return `0${v}`;
    } else {
      return `${v}`;
    }
  }

  build() {
    const { year, month } = this.getYearAndMonth();

    window.document.title = `${this.getYearAndMonthLabel({
      year,
      month,
    })} · Lutheran Lectionary`;

    const builder = new CalendarBuilder(year, month);
    return builder.build(loader);
  }

  goToDay(day) {
    return () => {
      window.location.hash = this.makeUrlToDay(day);
    };
  }

  makeUrlToDay(day) {
    const { year, month } = this.getYearAndMonth();
    return `/${year}/${month}/${day}/`;
  }

  getLiturgicalColorClass(color) {
    if (!color) return "";
    const colorLower = color.toLowerCase();
    return `liturgical-${colorLower}`;
  }

  getBorderColorClass(color) {
    if (!color) return "border-gray-300";
    const colorLower = color.toLowerCase();
    return `border-liturgical-${colorLower}`;
  }

  getBackgroundColorClass(color) {
    if (!color) return "";
    const colorLower = color.toLowerCase();
    return `bg-liturgical-${colorLower}`;
  }

  renderDay(day, weekDay) {
    const color =
      findColor(
        // Don't let festivals trump Sundays
        day?.date.weekday === 7 ? null : day?.propers.festivals,
        day?.propers.lectionary,
        day?.sunday?.propers.lectionary
      )?.toLowerCase() ?? "none";
    
    const isToday =
      day && day.date && DateTime.local().hasSame(day.date, "day");
    
    const colorClass = this.getLiturgicalColorClass(color);
    const borderClass = this.getBorderColorClass(color);
    const bgClass = this.getBackgroundColorClass(color);
    
    const className = `
      ${bgClass} ${borderClass} hover-illuminate gothic-shadow
      ${isToday ? "today" : ""}
    `.trim();

    if (!day || !day.date) {
      return <td className="border border-gray-200 bg-gray-50" key={weekDay} />;
    }

    const lectionary = day.propers.lectionary.filter((p) => hasReadings([p]));
    const festivals = day.propers.festivals.filter((p) => hasReadings([p]));
    const commemoration = findProperByType(day.propers.commemorations, 37);
    const dailyReadings = day.propers.daily.slice(0, 2);

    return (
      <td
        className={className}
        onClick={this.goToDay(day.date.day)}
        key={weekDay}
      >
        <div className="h-full flex flex-col">
          {/* Day number with liturgical color */}
          <div className={`day-number font-cinzel ${colorClass}`}>
            {day.date.day}
            {isToday && (
              <i className="fas fa-star ml-1 text-yellow-500 text-xs"></i>
            )}
          </div>

          {/* Festival/Lectionary Propers */}
          {[...festivals, ...lectionary].map((propers, i) => (
            <div key={i} className="mb-2">
              <div className={`proper-title font-garamond ${colorClass}`}>
                <i className="fas fa-cross mr-1 text-xs opacity-60"></i>
                {findProperByType([propers], 0)?.text}
              </div>
              <div className="proper-reading text-gray-600">
                OT: {findProperByType([propers], 19)?.text}
              </div>
              <div className="proper-reading text-gray-600">
                Ep: {findProperByType([propers], 1)?.text}
              </div>
              <div className="proper-reading text-gray-600">
                Go: {findProperByType([propers], 2)?.text}
              </div>
            </div>
          ))}

          {/* Commemoration */}
          {commemoration && (
            <div className="commemoration font-crimson">
              <i className="fas fa-praying-hands mr-1 text-xs"></i>
              {commemoration.text}
            </div>
          )}

          {/* Daily Readings */}
          {dailyReadings.map((reading, i) => (
            <div key={i} className="proper-reading text-gray-500 mt-1">
              <i className="fas fa-book-open mr-1 text-xs"></i>
              {reading.text}
            </div>
          ))}
        </div>
      </td>
    );
  }

  render() {
    const { year, month } = this.getYearAndMonth();
    const grid = this.build();

    if (!grid) {
      return <div className="flex justify-center items-center h-64">
        <i className="fas fa-spinner fa-spin text-2xl text-gray-500"></i>
      </div>;
    }

    return (
      <div className="calendar-container manuscript-border mx-auto max-w-7xl my-8">
        {/* Navigation */}
        <nav className="calendar-nav p-4 flex items-center justify-between">
          <Link 
            to={`/${Object.values(this.getLastMonth()).join("/")}/`}
            className="flex items-center gap-2 hover:scale-105 transition-transform"
          >
            <i className="fas fa-chevron-left"></i>
            <span className="font-garamond">
              {this.getYearAndMonthLabel(this.getLastMonth())}
            </span>
          </Link>
          
          <h2 className="font-cinzel text-xl md:text-2xl font-semibold text-center flex-1">
            <i className="fas fa-calendar-alt mr-2"></i>
            {this.getYearAndMonthLabel({ year, month })}
          </h2>
          
          <Link 
            to={`/${Object.values(this.getNextMonth()).join("/")}/`}
            className="flex items-center gap-2 hover:scale-105 transition-transform"
          >
            <span className="font-garamond">
              {this.getYearAndMonthLabel(this.getNextMonth())}
            </span>
            <i className="fas fa-chevron-right"></i>
          </Link>
        </nav>

        {/* Calendar Grid */}
        <div className="overflow-x-auto">
          <table className="calendar-table w-full">
            <thead>
              <tr>
                <th className="font-cinzel">
                  <i className="fas fa-sun mr-1"></i>
                  Sunday
                </th>
                <th className="font-cinzel">Monday</th>
                <th className="font-cinzel">Tuesday</th>
                <th className="font-cinzel">Wednesday</th>
                <th className="font-cinzel">Thursday</th>
                <th className="font-cinzel">Friday</th>
                <th className="font-cinzel">Saturday</th>
              </tr>
            </thead>
            <tbody>
              {grid.map((week, row) => (
                <tr key={row}>
                  {week.map((day, weekDay) => this.renderDay(day, weekDay))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="p-4 border-t border-gray-300 bg-gray-50">
          <div className="flex flex-wrap justify-center gap-4 text-sm font-garamond">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-liturgical-violet bg-liturgical-violet rounded"></div>
              <span>Advent/Lent</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-liturgical-white bg-liturgical-white rounded"></div>
              <span>Christmas/Easter</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-liturgical-green bg-liturgical-green rounded"></div>
              <span>Ordinary Time</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-liturgical-red bg-liturgical-red rounded"></div>
              <span>Martyrs/Pentecost</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-liturgical-rose bg-liturgical-rose rounded"></div>
              <span>Gaudete/Laetare</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
}