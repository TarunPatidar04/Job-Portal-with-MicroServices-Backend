import axios from "axios";
import { AuthenticatedRequest } from "../middleware/auth.js";
import getBuffer from "../utils/buffer.js";
import { sql } from "../utils/db.js";
import ErrorHandler from "../utils/errorHandler.js";
import { TryCatch } from "../utils/TryCatch.js";
import { applicationStatusUpdateTemplate } from "../template.js";
import { publicToTopic } from "../producer.js";

export const createCompany = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    const user = req.user;

    if (!user) {
      throw new ErrorHandler(401, "Authencation required");
    }

    if (user?.role !== "recruiter") {
      throw new ErrorHandler(
        403,
        "Forbidden : Only recruiter can create company",
      );
    }

    const { name, description, website } = req.body;

    if (!name || !description || !website) {
      throw new ErrorHandler(400, "All the fields required");
    }

    const existingCompanies =
      await sql`SELECT company_id FROM companies WHERE name=${name}`;

    if (existingCompanies.length > 0) {
      throw new ErrorHandler(
        409,
        `A company with the name ${name} already exists`,
      );
    }

    const file = req.file;

    if (!file) {
      throw new ErrorHandler(400, "Company logo file is required");
    }

    const fileBuffer = getBuffer(file);

    if (!fileBuffer || !fileBuffer.content) {
      throw new ErrorHandler(500, "Failed to creat file buffer");
    }

    const { data } = await axios.post<{ url: string; public_id: string }>(
      `${process.env.UPLOAD_SERVICE}/api/utils/upload`,
      {
        buffer: fileBuffer.content,
      },
    );

    const [newCompany] = await sql`
    INSERT INTO companies (name,description,website,logo,logo_public_id,recruiter_id)
    VALUES (${name},${description},${website},${data.url},${data.public_id}, ${user.user_id})
    RETURNING *;
    `;

    return res.status(201).json({
      success: true,
      message: "Company created successfully",
      company: newCompany,
    });
  },
);

export const deleteCompany = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    const user = req.user;
    const { companyId } = req.params;

    const [company] = await sql`
  SELECT logo_public_id FROM companies WHERE 
  company_id =${companyId} AND recruiter_id=${user?.user_id}
  `;

    if (!company) {
      throw new ErrorHandler(
        404,
        "Company not found or you are not authorized to delete it",
      );
    }

    await sql`DELETE FROM companies WHERE company_id =${companyId}`;

    return res.status(200).json({
      success: true,
      message: "Company and all associated jobs have been deleted successfully",
    });
  },
);

export const createJob = TryCatch(async (req: AuthenticatedRequest, res) => {
  const user = req.user;

  if (!user) {
    throw new ErrorHandler(401, "Authencation required");
  }

  if (user?.role !== "recruiter") {
    throw new ErrorHandler(403, "Forbidden : Only recruiter can create job");
  }

  const {
    title,
    description,
    salary,
    location,
    role,
    job_type,
    work_location,
    company_id,
    openings,
  } = req.body;

  if (!title || !description || !salary || !location || !role || !openings) {
    throw new ErrorHandler(400, "All the fields required");
  }

  const [company] = await sql`
  SELECT company_id FROM companies WHERE company_id=${company_id} AND recruiter_id=${user.user_id}
  `;

  if (!company) {
    throw new ErrorHandler(
      404,
      "Company not found or you are not authorized to create job in this company",
    );
  }

  const [newJob] = await sql`
  
  INSERT INTO jobs (title,description,salary,location,role,job_type,work_location,
  company_id,posted_by_recuriter_id,openings)
  VALUES (${title},${description},${salary},${location},${role},${job_type},
  ${work_location},${company_id},${user.user_id},${openings})
  RETURNING *;
  `;

  return res.status(201).json({
    success: true,
    message: "Job created successfully",
    job: newJob,
  });
});

export const updateJob = TryCatch(async (req: AuthenticatedRequest, res) => {
  const user = req.user;

  if (!user) {
    throw new ErrorHandler(401, "Authencation required");
  }

  if (user?.role !== "recruiter") {
    throw new ErrorHandler(403, "Forbidden : Only recruiter can create job");
  }

  const {
    title,
    description,
    salary,
    location,
    role,
    job_type,
    work_location,
    company_id,
    openings,
    is_active,
  } = req.body;

  const [existingJob] = await sql`
  SELECT posted_by_recuriter_id FROM jobs WHERE job_id=${req.params.jobId}
  `;

  if (!existingJob) {
    throw new ErrorHandler(404, "job not found");
  }

  if (existingJob.posted_by_recuriter_id !== user.user_id) {
    throw new ErrorHandler(
      403,
      "Forbidden : Only recruiter can update job and You are not allowed",
    );
  }

  const [updatedJob] = await sql`
  UPDATE jobs SET title =${title},
  description=${description},
  salary=${salary},
  location=${location},
  role=${role},
  job_type=${job_type},
  work_location=${work_location},
  openings=${openings},
  is_active=${is_active}
  WHERE job_id=${req.params.jobId}
  RETURNING *;
  `;

  return res.status(200).json({
    success: true,
    message: "Job updated successfully",
    job: updatedJob,
  });
});

export const getAllCompany = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    const companies =
      await sql`SELECT * FROM companies WHERE recruiter_id=${req.user?.user_id}`;

    return res.status(200).json({
      success: true,
      message: "Companies fetched successfully",
      companies,
    });
  },
);

export const getCompanyDetails = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    const { companyId } = req.params;

    if (!companyId) {
      throw new ErrorHandler(400, "Company ID is required");
    }

    const [companyData] = await sql`
      SELECT c.*,COALESCE(
      (
      SELECT json_agg(
        json_build_object(
          'job_id', j.job_id,
          'title', j.title,
          'description', j.description,
          'salary', j.salary,
          'location', j.location,
          'job_type', j.job_type,
          'role', j.role,
          'work_location', j.work_location,
          'openings', j.openings,
          'is_active', j.is_active,
          'created_at', j.created_at,
          'application_count', COALESCE(app_count.count, 0)
        )
      ) FROM jobs j 
      LEFT JOIN (
        SELECT job_id, COUNT(*) as count
        FROM applications 
        GROUP BY job_id
      ) app_count ON j.job_id = app_count.job_id
      WHERE j.company_id = c.company_id
      ),
      '[]'::json
      ) AS jobs
      FROM companies c
      WHERE c.company_id = ${companyId} GROUP BY c.company_id;
      `;

    if (!companyData) {
      throw new ErrorHandler(404, "Company not found");
    }

    return res.status(200).json({
      success: true,
      message: "Company details fetched successfully",
      companyData,
    });
  },
);

export const getAllActiveJobs = TryCatch(async (req, res) => {
  const { title, location } = req.query as {
    title?: string;
    location?: string;
  };

  let queryString = `
  SELECT j.job_id,
  j.title,
  j.description,
  j.salary,
  j.location,
  j.job_type,
  j.role,
  j.work_location,
  j.created_at,
  c.name AS company_name,
  c.logo AS company_logo,
  c.company_id AS company_id
  FROM jobs j
  JOIN companies c ON j.company_id = c.company_id
  WHERE j.is_active = true
  `;

  const values = [];
  let paramIndex = 1;

  if (title) {
    queryString += ` AND j.title ILIKE $${paramIndex}`;
    values.push(`%${title}%`);
    paramIndex++;
  }

  if (location) {
    queryString += ` AND j.location ILIKE $${paramIndex}`;
    values.push(`%${location}%`);
    paramIndex++;
  }

  queryString += ` ORDER BY j.created_at DESC`;

  const jobs = (await sql.query(queryString, values)) as any[];

  return res.status(200).json({
    success: true,
    message: "Jobs fetched successfully",
    jobs,
  });
});

export const getSingleJob = TryCatch(async (req, res) => {
  const { jobId } = req.params;

  if (!jobId) {
    throw new ErrorHandler(400, "Job ID is required");
  }

  const [job] = await sql`SELECT * FROM jobs WHERE job_id=${jobId}`;

  if (!job) {
    throw new ErrorHandler(404, "Job not found");
  }

  return res.status(200).json({
    success: true,
    message: "Job fetched successfully",
    job,
  });
});

export const getAllApplicationForJob = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    const user = req.user;

    if (!user) {
      throw new ErrorHandler(401, "Authencation required");
    }

    if (user?.role !== "recruiter") {
      throw new ErrorHandler(403, "Forbidden : Only recruiter can view a job");
    }

    const { jobId } = req.params;

    if (!jobId) {
      throw new ErrorHandler(400, "Job ID is required");
    }

    const [job] =
      await sql`SELECT posted_by_recuriter_id FROM jobs WHERE job_id=${jobId}`;

    if (!job) {
      throw new ErrorHandler(404, "Job not found");
    }

    if (job.posted_by_recuriter_id !== user.user_id) {
      throw new ErrorHandler(
        403,
        "Forbidden : Only recruiter can view applications for their job",
      );
    }

    const applications =
      await sql`SELECT a.*, u.name as applicant_name FROM applications a JOIN users u ON a.applicant_id = u.user_id WHERE a.job_id=${jobId} ORDER BY a.subscribed DESC, a.applied_at ASC`;

    return res.status(200).json({
      success: true,
      message: "Applications fetched successfully",
      applications,
    });
  },
);

export const updateApplication = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    const user = req.user;

    if (!user) {
      throw new ErrorHandler(401, "Authencation required");
    }

    if (user?.role !== "recruiter") {
      throw new ErrorHandler(403, "Forbidden : Only recruiter can view a job");
    }

    const { id } = req.params;

    const [application] = await sql`
    SELECT * FROM applications WHERE application_id=${id}
    `;

    if (!application) {
      throw new ErrorHandler(404, "Application not found");
    }

    const [job] = await sql`
   SELECT posted_by_recuriter_id,title FROM jobs WHERE job_id=${application.job_id}
    `;

    if (!job) {
      throw new ErrorHandler(404, "Job not found");
    }

    if (job.posted_by_recuriter_id !== user.user_id) {
      throw new ErrorHandler(
        403,
        "Forbidden : Only recruiter can update applications for their job",
      );
    }

    const [updatedApplication] = await sql`
    UPDATE applications SET status=${req.body.status} WHERE application_id=${id}
    RETURNING *;
    `;

    // If status is 'Hired', deactivate the job to prevent more applications
    if (req.body.status === 'Hired') {
      await sql`
      UPDATE jobs SET is_active=false WHERE job_id=${application.job_id}
      `;
    }

    const message = {
      to: application.applicant_email,
      subject: "Application status updated",
      html: applicationStatusUpdateTemplate(job.title),
    };

    publicToTopic("send-mail", message).catch((error) => {
      console.log("Failed to publish message to kafka", error);
    });

    return res.status(200).json({
      success: true,
      message: "Application updated successfully",
      application: updatedApplication,
    });
  },
);
