// Client-safe curated job circular seed data for the Live Jobs screen.

export interface JobCircular {
  id: string;
  organization: string;
  position: string;
  category: JobCategory;
  deadline: string;
  salary: string;
  location: string;
  eligibility: string;
  vacancies: number;
  link: string;
}

export const JOB_CATEGORIES = [
  "Government",
  "Bank",
  "Private",
  "NGO",
  "Engineering",
  "Medical",
  "University",
  "Scholarship",
] as const;

export type JobCategory = (typeof JOB_CATEGORIES)[number];

export const JOB_CIRCULARS: JobCircular[] = [
  {
    id: "bpsc-46-bcs",
    organization: "Bangladesh Public Service Commission",
    position: "46th BCS Cadre Recruitment",
    category: "Government",
    deadline: "2026-09-15",
    salary: "৳22,000 – ৳53,060",
    location: "All Bangladesh",
    eligibility: "Bachelor's degree, age 21–32",
    vacancies: 3140,
    link: "http://bpsc.gov.bd/",
  },
  {
    id: "bb-officer",
    organization: "Bangladesh Bank",
    position: "Assistant Director (General)",
    category: "Bank",
    deadline: "2026-08-28",
    salary: "৳22,000 – ৳53,060",
    location: "Dhaka",
    eligibility: "Bachelor's/Master's, min CGPA 3.00",
    vacancies: 120,
    link: "https://erecruitment.bb.org.bd/",
  },
  {
    id: "primary-teacher",
    organization: "Directorate of Primary Education",
    position: "Assistant Teacher",
    category: "Government",
    deadline: "2026-09-02",
    salary: "৳11,000 – ৳26,590",
    location: "District based",
    eligibility: "Bachelor's degree (2nd class)",
    vacancies: 6500,
    link: "http://dpe.gov.bd/",
  },
  {
    id: "brac-po",
    organization: "BRAC",
    position: "Programme Organiser — Microfinance",
    category: "NGO",
    deadline: "2026-08-20",
    salary: "৳32,000 (negotiable)",
    location: "Field, nationwide",
    eligibility: "Graduate, willing to work in the field",
    vacancies: 300,
    link: "https://careers.brac.net/",
  },
  {
    id: "grameenphone-mt",
    organization: "Grameenphone",
    position: "Management Trainee 2026",
    category: "Private",
    deadline: "2026-08-18",
    salary: "Attractive corporate package",
    location: "Dhaka",
    eligibility: "Fresh graduate, max 2 years experience",
    vacancies: 25,
    link: "https://www.grameenphone.com/about/careers",
  },
  {
    id: "rhd-sub-assistant",
    organization: "Roads & Highways Department",
    position: "Sub-Assistant Engineer (Civil)",
    category: "Engineering",
    deadline: "2026-09-10",
    salary: "৳16,000 – ৳38,640",
    location: "Divisional offices",
    eligibility: "Diploma in Civil Engineering",
    vacancies: 210,
    link: "http://www.rhd.gov.bd/",
  },
  {
    id: "dgh-nurse",
    organization: "Directorate General of Health Services",
    position: "Senior Staff Nurse",
    category: "Medical",
    deadline: "2026-08-30",
    salary: "৳16,000 – ৳38,640",
    location: "Government hospitals",
    eligibility: "BSc in Nursing / Diploma, BNMC registered",
    vacancies: 1500,
    link: "https://dghs.gov.bd/",
  },
  {
    id: "du-lecturer",
    organization: "University of Dhaka",
    position: "Lecturer — Department of Economics",
    category: "University",
    deadline: "2026-09-05",
    salary: "৳35,500 – ৳67,010",
    location: "Dhaka",
    eligibility: "Master's with 1st class, publications preferred",
    vacancies: 4,
    link: "https://www.du.ac.bd/",
  },
  {
    id: "pmeat-scholarship",
    organization: "Ministry of Education",
    position: "Prime Minister's Education Assistance Trust Scholarship",
    category: "Scholarship",
    deadline: "2026-08-25",
    salary: "৳4,500 / month stipend",
    location: "Nationwide",
    eligibility: "HSC/Honours students, needs-based",
    vacancies: 10000,
    link: "https://www.eduboardresults.gov.bd/",
  },
  {
    id: "sonali-bank-so",
    organization: "Sonali Bank PLC",
    position: "Senior Officer (IT)",
    category: "Bank",
    deadline: "2026-09-12",
    salary: "৳22,000 – ৳53,060",
    location: "Dhaka & regional",
    eligibility: "BSc in CSE/EEE, min CGPA 3.00",
    vacancies: 90,
    link: "https://erecruitment.bb.org.bd/",
  },
];

export function daysUntil(date: string): number {
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
}
