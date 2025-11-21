import ProductionCard from './ProductionCard';

const StageColumn = ({ stage, jobs, onJobClick }) => {
  const jobCount = jobs.length;
  const inProgressCount = jobs.filter((j) => j.status === 'IN_PROGRESS').length;

  return (
    <div className="flex-shrink-0 w-80">
      <div className="bg-gray-100 rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-gray-900">{stage}</h2>
          <span className="text-sm text-gray-600">
            {inProgressCount > 0 && `${inProgressCount}/`}
            {jobCount}
          </span>
        </div>
        <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
          {jobs.length === 0 ? (
            <div className="text-center text-gray-400 text-sm py-8">
              No jobs
            </div>
          ) : (
            jobs.map((job) => (
              <ProductionCard
                key={job.id}
                job={job}
                onJobClick={onJobClick}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default StageColumn;

