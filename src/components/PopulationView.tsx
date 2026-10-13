import { NATION_SHARES, POPULATION, POPULATION_GROWTH } from "../data/population";
import { PopulationChart } from "./PopulationChart";

/** Bar scale, in millions. Matches the chart's y-axis so the two line up. */
const BAR_MAX = 70;

export function PopulationView() {
  return (
    <section
      className="population"
      tabIndex={0}
      aria-label="UK population over time"
    >
      <p className="population__intro">
        How the UK's population has grown, using the "Population growth in the
        UK" table from <em>Life in the United Kingdom: A Guide for New
        Residents</em> (chapter "A modern, thriving society", sourced from
        National Statistics). The handbook gives the figures in words rather
        than numbers, so that wording is kept as closely as the layout allows.
      </p>

      <section className="pop-card" aria-labelledby="pop-shape">
        <h2 className="pop-card__title" id="pop-shape">
          The shape of the growth
        </h2>
        <PopulationChart />
        <p className="pop-card__caption">
          Slowly at first, then racing away from the 19th century onwards.
        </p>
      </section>

      <section aria-labelledby="pop-numbers">
        <h2 className="pop-heading" id="pop-numbers">
          The numbers to remember
        </h2>
        <ul className="milestones">
          {POPULATION.map((point) => (
            <li className="milestone" key={point.year}>
              <p className="milestone__year">{point.year}</p>
              <p className="milestone__value">{point.label}</p>
              <div className="milestone__track">
                <span
                  className="milestone__bar"
                  style={{ width: `${(point.millions / BAR_MAX) * 100}%` }}
                />
              </div>
              {point.note && <p className="milestone__note">{point.note}</p>}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="pop-remember">
        <h2 className="pop-heading" id="pop-remember">
          How to remember it
        </h2>
        <ul className="growth">
          {POPULATION_GROWTH.map((step) => (
            <li className="growth__item" key={step.from}>
              <span className="growth__span">
                {step.from} → {step.to}
              </span>
              <span className="growth__text">{step.text}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="pop-nations">
        <h2 className="pop-heading" id="pop-nations">
          Where the people live
        </h2>
        <p className="population__sub">
          The population is very unequally distributed over the four parts of
          the UK.
        </p>
        <div className="nations__bar" aria-hidden="true">
          {NATION_SHARES.map((nation) => (
            <span
              key={nation.id}
              className={`nations__seg nations__seg--${nation.id}`}
              style={{ width: `${nation.share}%` }}
            />
          ))}
        </div>
        <ul className="nations">
          {NATION_SHARES.map((nation) => (
            <li className="nations__item" key={nation.id}>
              <span className={`nations__dot nations__dot--${nation.id}`} />
              <span className="nations__name">{nation.name}</span>
              <span className="nations__share">{nation.label}</span>
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}
